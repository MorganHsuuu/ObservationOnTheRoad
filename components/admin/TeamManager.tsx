"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { deleteTeam, moveParticipant, removeParticipant, renameParticipant, upsertTeam } from "@/app/actions/admin";
import { ProgressPie } from "@/components/ProgressPie";
import { Button, Card } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import { isStudentOnline } from "@/lib/broadcast";
import { membersOfTeam, studentDoneTask, teamTaskProgress } from "@/lib/progress";
import { boardTaskCode, currentTask } from "@/lib/task-utils";
import { digitsOnly, sanitizeStudentId, teamLabel } from "@/lib/team-code";
import type { ParticipantRow, TaskRow, TeamRow } from "@/lib/types";

export function TeamManager({
  slug,
  teams,
  tasks,
  submissions,
  participants,
}: {
  slug: string;
  teams: TeamRow[];
  tasks: TaskRow[];
  submissions: { task_id: string; student_id: string | null; team_id: string | null }[];
  participants: ParticipantRow[];
}) {
  const { start, stop } = useNavPending();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [people, setPeople] = useState(participants);
  const busyRef = useRef(false);
  const published = currentTask(tasks);
  const released = useMemo(
    () => tasks.filter((task) => task.status === "published" || task.status === "closed"),
    [tasks],
  );

  useEffect(() => {
    setPeople(participants);
  }, [participants]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!busyRef.current) return;
    stop();
    setBusy(false);
  }, [stop, teams]);

  async function onCreate(formData: FormData) {
    if (busy) return;
    setBusy(true);
    setError("");
    start("新增中");
    const result = await upsertTeam(slug, {
      code: String(formData.get("code") ?? ""),
      members: null,
    });
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
    }
  }

  async function onMove(person: ParticipantRow, teamId: string) {
    if (busy || person.team_id === teamId) return;
    const from = teamLabel(teams.find((item) => item.id === person.team_id));
    const to = teamLabel(teams.find((item) => item.id === teamId));
    if (!window.confirm(`把 ${person.student_name} 從${from}改到${to}？已交的照片會跟著過去。`)) {
      return;
    }
    setBusy(true);
    setError("");
    const result = await moveParticipant(slug, person.id, teamId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople((list) => list.map((item) => (item.id === person.id ? { ...item, team_id: teamId } : item)));
  }

  async function onRename(person: ParticipantRow, studentId: string) {
    const nextId = sanitizeStudentId(studentId);
    if (busy || !nextId || nextId === person.student_id) return;
    if (
      !window.confirm(
        `把 ${person.student_name} 的學號改成 ${nextId}？這台手機要重新加入，請填新學號。已交的照片會跟著過去。`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const result = await renameParticipant(slug, person.id, nextId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople((list) => list.map((item) => (item.id === person.id ? { ...item, student_id: nextId } : item)));
  }

  async function onRemove(person: ParticipantRow) {
    if (busy) return;
    if (
      !window.confirm(
        `把 ${person.student_name} 從名單刪掉？這台手機要重新加入才能進來。已交的照片還在，加入正確組別後會跟著過去。`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const result = await removeParticipant(slug, person.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople((list) => list.filter((item) => item.id !== person.id));
  }

  async function onDelete(team: TeamRow) {
    if (busy) return;
    const label = teamLabel(team);
    if (!window.confirm(`確定刪除${label}？這一組的學生之後就不能用代碼 ${team.code} 進來。`)) {
      return;
    }
    setBusy(true);
    setError("");
    start("刪除中");
    const result = await deleteTeam(slug, team.id);
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
    }
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => {
        const members = membersOfTeam(people, team.id);
        const { done, total } = teamTaskProgress(team.id, published?.id ?? null, people, submissions);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const open = openId === team.id;
        return (
          <Card key={team.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              onClick={() => setOpenId(open ? null : team.id)}
            >
              <ProgressPie done={done} total={total} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-lg font-black">{teamLabel(team)}</span>
                  <span className="text-xs font-black tracking-[0.16em] text-muted">
                    代碼 {team.code}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] font-black text-muted">
                  {total > 0
                    ? `${members.length} 人・目前題 ${done}/${total}（${pct}%）`
                    : "還沒有人加入"}
                </p>
              </div>
              {open ? (
                <CaretUp weight="bold" size={18} className="shrink-0" aria-hidden />
              ) : (
                <CaretDown weight="bold" size={18} className="shrink-0" aria-hidden />
              )}
            </button>
            {open ? (
              <div className="border-t-2 border-ink">
                {members.length === 0 ? (
                  <p className="px-3.5 py-4 text-sm font-medium text-muted">
                    學生用代碼 {team.code} 加入後，進度會出現在這裡。
                  </p>
                ) : (
                  members.map((person) => {
                    const online = isStudentOnline(person.last_seen_at);
                    return (
                      <div
                        key={person.id}
                        className="flex items-start gap-3 border-b-2 border-ink px-3.5 py-3 last:border-b-0"
                      >
                        <span
                          className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                            online ? "bg-[#1B8A3A]" : "bg-[#DEDCD4]"
                          }`}
                          title={online ? "在線" : "離線"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-black">{person.student_name}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {released.length === 0 ? (
                              <span className="text-xs font-medium text-muted">還沒有發布任務</span>
                            ) : (
                              released.map((task) => {
                                const got = studentDoneTask(submissions, person.student_id, task.id);
                                return (
                                  <span
                                    key={task.id}
                                    className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${
                                      got ? "bg-ink text-paper" : "bg-card text-muted"
                                    }`}
                                  >
                                    {boardTaskCode(task.id, tasks)}
                                  </span>
                                );
                              })
                            )}
                          </div>
                          <div className="mt-2 space-y-2">
                            <StudentIdField
                              key={`${person.id}:${person.student_id}`}
                              name={person.student_name}
                              studentId={person.student_id}
                              busy={busy}
                              onSave={(value) => void onRename(person, value)}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              {teams.length > 1 ? (
                                <select
                                  value={person.team_id}
                                  disabled={busy}
                                  aria-label={`把 ${person.student_name} 換組`}
                                  className="h-11 min-w-[7.5rem] flex-1 border-2 border-ink bg-card px-2 text-sm font-black disabled:opacity-50"
                                  onChange={(event) => void onMove(person, event.target.value)}
                                >
                                  {teams.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {teamLabel(item)}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                              <button
                                type="button"
                                disabled={busy}
                                className="h-11 shrink-0 px-3 text-sm font-black text-danger disabled:opacity-50"
                                onClick={() => void onRemove(person)}
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="flex justify-end px-3.5 py-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 text-sm font-black text-danger disabled:opacity-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDelete(team);
                    }}
                  >
                    刪除這一組
                  </button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}

      <Card>
        <button
          type="button"
          className="flex w-full items-center justify-between px-3.5 py-3 text-left text-sm font-black"
          onClick={() => setAdding((value) => !value)}
        >
          新增組別
          <span className="text-muted">{adding ? "收合" : "展開"}</span>
        </button>
        {adding ? (
          <form action={onCreate} className="space-y-3 border-t-2 border-ink p-3.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-black tracking-[0.2em] text-muted">代碼</span>
              <input
                name="code"
                placeholder="01"
                required
                disabled={busy}
                inputMode="numeric"
                maxLength={2}
                className="h-12 w-24 border-2 border-ink px-3 text-center text-xl font-black tracking-[0.3em] disabled:opacity-50"
                onInput={(event) => {
                  const input = event.currentTarget;
                  input.value = digitsOnly(input.value).slice(0, 2);
                }}
              />
            </label>
            <Button type="submit" className="min-h-12 text-[15px]" disabled={busy}>
              {busy ? "處理中…" : "加入這一組"}
            </Button>
            {error ? <p className="bg-danger px-3 py-2 text-sm font-black text-white">{error}</p> : null}
          </form>
        ) : error ? (
          <p className="border-t-2 border-ink bg-danger px-3 py-2 text-sm font-black text-white">{error}</p>
        ) : null}
      </Card>
    </div>
  );
}

function StudentIdField({
  name,
  studentId,
  busy,
  onSave,
}: {
  name: string;
  studentId: string;
  busy: boolean;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(studentId);
  const dirty = sanitizeStudentId(value) !== studentId && sanitizeStudentId(value).length > 0;

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty) onSave(value);
      }}
    >
      <input
        value={value}
        disabled={busy}
        maxLength={32}
        aria-label={`${name} 的學號`}
        className="h-11 min-w-0 flex-1 border-2 border-ink bg-card px-2 text-sm font-black disabled:opacity-50"
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="submit"
        disabled={busy || !dirty}
        className="h-11 shrink-0 px-3 text-sm font-black disabled:opacity-40"
      >
        改學號
      </button>
    </form>
  );
}
