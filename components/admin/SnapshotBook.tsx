"use client";

import { useState } from "react";
import { listEventSnapshots, readEventSnapshot, saveEventSnapshot } from "@/app/actions/admin";
import { formatTaipeiDate, formatTaipeiTime } from "@/lib/time";
import type {
  RosterSnapshotPerson,
  SnapshotKind,
  SnapshotListItem,
  TaskSnapshotItem,
} from "@/lib/types";

export function SnapshotBook({ slug, kind }: { slug: string; kind: SnapshotKind }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SnapshotListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [people, setPeople] = useState<RosterSnapshotPerson[] | null>(null);
  const [tasks, setTasks] = useState<TaskSnapshotItem[] | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadList(preferId?: string) {
    const result = await listEventSnapshots(slug, kind);
    if (!result.ok) {
      setError(result.error);
      setRows([]);
      return;
    }
    setRows(result.data);
    const nextId = preferId && result.data.some((item) => item.id === preferId) ? preferId : result.data[0]?.id;
    if (nextId) await loadOne(nextId);
    else {
      setSelectedId("");
      setPeople(null);
      setTasks(null);
    }
  }

  async function loadOne(id: string) {
    setSelectedId(id);
    const result = await readEventSnapshot(slug, id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.kind === "roster") {
      setPeople(result.data.payload as RosterSnapshotPerson[]);
      setTasks(null);
    } else {
      setTasks(result.data.payload as TaskSnapshotItem[]);
      setPeople(null);
    }
  }

  async function openBook() {
    setOpen(true);
    setError("");
    setHint("");
    setBusy(true);
    await loadList();
    setBusy(false);
  }

  async function saveNow() {
    setBusy(true);
    setError("");
    setHint("");
    const result = await saveEventSnapshot(slug, kind);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setHint(result.data.saved ? "已記一筆，現在的資料沒有被改動。" : "跟上一筆一樣，沒有另存。");
    await loadList();
  }

  const title = kind === "roster" ? "組別版本紀錄" : "題庫版本紀錄";

  return (
    <>
      <button
        type="button"
        onClick={() => void openBook()}
        className="shrink-0 border-2 border-ink bg-card px-3 py-2 text-sm font-black active:bg-yellow"
      >
        版本紀錄
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/90 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-[880px] flex-col border-2 border-ink bg-card">
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-4 py-3">
              <div>
                <p className="text-[11px] font-black tracking-[0.2em] text-muted">只讀副本</p>
                <h2 className="text-2xl font-black">{title}</h2>
              </div>
              <button type="button" className="font-black" onClick={() => setOpen(false)}>
                關閉
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink px-4 py-3">
              <label className="min-w-[220px] flex-1 text-sm font-black">
                <span className="sr-only">選擇版本</span>
                <select
                  value={selectedId}
                  disabled={rows.length === 0}
                  className="h-11 w-full border-2 border-ink bg-card px-2"
                  onChange={(event) => void loadOne(event.target.value)}
                >
                  {rows.length === 0 ? <option value="">還沒有紀錄</option> : null}
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {formatTaipeiDate(row.createdAt)} {formatTaipeiTime(row.createdAt)}・
                      {row.source === "daily" ? "每日" : "手動"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                className="h-11 border-2 border-ink bg-yellow px-3 text-sm font-black disabled:opacity-50"
                onClick={() => void saveNow()}
              >
                現在記一筆
              </button>
            </div>
            <div className="overflow-auto px-4 py-3">
              <p className="mb-3 text-sm font-medium text-muted">
                每天自動留一份。這裡只是當時的表格，不會改組別、題目或學生已交的內容。
              </p>
              {error ? <p className="mb-3 bg-danger px-3 py-2 text-sm font-black text-white">{error}</p> : null}
              {hint ? <p className="mb-3 bg-yellow px-3 py-2 text-sm font-black">{hint}</p> : null}
              {kind === "roster" && people ? <RosterTable people={people} /> : null}
              {kind === "tasks" && tasks ? <TaskTable tasks={tasks} /> : null}
              {!busy && rows.length === 0 ? (
                <p className="py-6 text-sm font-black">還沒有紀錄。按「現在記一筆」留第一份。</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RosterTable({ people }: { people: RosterSnapshotPerson[] }) {
  if (people.length === 0) return <p className="py-6 text-sm font-black">這份紀錄裡還沒有學生。</p>;
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b-2 border-ink text-[11px] tracking-[0.16em] text-muted">
          <th className="py-2 pr-3 font-black">組別</th>
          <th className="py-2 pr-3 font-black">姓名</th>
          <th className="py-2 pr-3 font-black">學號</th>
          <th className="py-2 font-black">完成率</th>
        </tr>
      </thead>
      <tbody>
        {people.map((person) => (
          <tr key={`${person.team}-${person.studentId}`} className="border-b border-[#DEDCD4]">
            <td className="py-2 pr-3 font-black">{person.team}</td>
            <td className="py-2 pr-3 font-black">{person.name}</td>
            <td className="py-2 pr-3">{person.studentId}</td>
            <td className="py-2 font-black">
              {person.total > 0 ? `${person.done}/${person.total}・${person.pct}%` : "還沒有可做的題"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TaskTable({ tasks }: { tasks: TaskSnapshotItem[] }) {
  if (tasks.length === 0) return <p className="py-6 text-sm font-black">這份紀錄裡還沒有題目。</p>;
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b-2 border-ink text-[11px] tracking-[0.16em] text-muted">
          <th className="py-2 pr-3 font-black">編號</th>
          <th className="py-2 pr-3 font-black">標題</th>
          <th className="py-2 pr-3 font-black">狀態</th>
          <th className="py-2 font-black">張數</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={`${task.code}-${task.title}`} className="border-b border-[#DEDCD4] align-top">
            <td className="py-2 pr-3 font-black">{task.code}</td>
            <td className="py-2 pr-3">
              <p className="font-black">{task.title}</p>
              <p className="mt-1 whitespace-pre-line text-xs font-medium text-muted">{task.prompt}</p>
            </td>
            <td className="py-2 pr-3 font-black">{task.status}</td>
            <td className="py-2 font-black">{task.maxPhotos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
