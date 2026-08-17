"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DotsSixVertical, LockSimple } from "@phosphor-icons/react";
import {
  deleteTask,
  duplicateTask,
  importTasksFromEvent,
  reorderTasks,
} from "@/app/actions/admin";
import { TaskEditor } from "@/components/admin/TaskEditor";
import { Card } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import { shortTaskTitle, taskStatusLabel } from "@/lib/task-utils";
import { taskCode } from "@/lib/time";
import type { ActionResult, EventRow, TaskRow } from "@/lib/types";

export function TaskManager({
  slug,
  tasks,
  otherEvents,
  initialEditId,
}: {
  slug: string;
  tasks: TaskRow[];
  otherEvents: EventRow[];
  initialEditId?: string;
}) {
  const router = useRouter();
  const { start, stop } = useNavPending();
  const [editing, setEditing] = useState<Partial<TaskRow> | null>(() => {
    if (!initialEditId) return null;
    return tasks.find((task) => task.id === initialEditId) ?? null;
  });
  const [error, setError] = useState("");
  const [source, setSource] = useState(otherEvents[0]?.slug ?? "");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const itemsRef = useRef(items);
  const dragIdRef = useRef<string | null>(null);
  const originRef = useRef(tasks.map((task) => task.id).join(","));
  busyRef.current = busy;
  itemsRef.current = items;

  useEffect(() => {
    if (!busyRef.current) setItems(tasks);
  }, [tasks]);

  useEffect(() => {
    if (!busyRef.current) return;
    stop();
    setBusy(false);
  }, [stop, tasks]);

  async function mutate(label: string, action: () => Promise<ActionResult<unknown>>) {
    if (busy) return;
    setBusy(true);
    setError("");
    start(label);
    const result = await action();
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function afterSave() {
    setEditing(null);
    setBusy(true);
    start("更新畫面");
    router.refresh();
  }

  function onPointerDown(taskId: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (busy || editing) return;
    const task = itemsRef.current.find((item) => item.id === taskId);
    if (!task || task.status !== "draft") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    originRef.current = itemsRef.current.map((item) => item.id).join(",");
    dragIdRef.current = taskId;
    setDragId(taskId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const dragId = dragIdRef.current;
    if (!dragId) return;
    const over = [...document.querySelectorAll<HTMLElement>("[data-task-row]")].find((row) => {
      const rect = row.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY < rect.bottom;
    });
    const overId = over?.dataset.taskRow;
    if (!overId || overId === dragId) return;
    setItems((list) => {
      const from = list.findIndex((task) => task.id === dragId);
      const to = list.findIndex((task) => task.id === overId);
      if (from < 0 || to < 0 || from === to) return list;
      if (list[from]?.status !== "draft" || list[to]?.status !== "draft") return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onPointerUp() {
    if (!dragIdRef.current) return;
    dragIdRef.current = null;
    setDragId(null);
    const ids = itemsRef.current.map((task) => task.id);
    if (ids.join(",") === originRef.current) return;
    void mutate("排序中", () => reorderTasks(slug, ids));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="min-h-14 border-2 border-ink bg-ink px-4 font-black text-paper disabled:opacity-50"
          onClick={() =>
            setEditing({
              title: "",
              prompt_md: "",
              hint: "",
              requires_caption: true,
              max_photos: 1,
            })
          }
        >
          新增任務
        </button>
        {otherEvents.length > 0 ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void mutate("匯入中", () => importTasksFromEvent(slug, source));
            }}
          >
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              disabled={busy}
              className="min-h-14 border-2 border-ink bg-card px-3 font-black disabled:opacity-50"
            >
              {otherEvents.map((item) => (
                <option key={item.id} value={item.slug}>
                  從 {item.title} 匯入
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="min-h-14 border-2 border-ink bg-card px-4 font-black disabled:opacity-50"
            >
              匯入題庫
            </button>
          </form>
        ) : null}
      </div>

      {error ? <p className="bg-danger px-3 py-3 font-black text-white">{error}</p> : null}

      {editing && !editing.id ? (
        <Card className="p-4">
          <h2 className="mb-3 text-lg font-black">新增任務</h2>
          <TaskEditor
            slug={slug}
            initial={editing}
            stayPending
            onCancel={() => setEditing(null)}
            onSaved={afterSave}
          />
        </Card>
      ) : null}

      <p className="text-sm font-medium text-muted">
        左邊是排序。第四個發布的會變成任務 04，後面往後順延。已發布不能拖。
      </p>
      <div className="space-y-2">
        {items.map((task, index) => {
          const code = taskCode(index + 1);
          const locked = task.status !== "draft";
          const published = task.status === "published";
          return (
            <div key={task.id} data-task-row={task.id} className="flex items-stretch gap-2">
              <div className="flex w-12 shrink-0 flex-col items-center justify-center">
                <span className="text-[11px] font-black tracking-[0.16em] text-muted">任務</span>
                <span className="text-xl font-black leading-none">{code}</span>
              </div>
              <section
                className={`relative min-w-0 flex-1 overflow-hidden border-2 border-ink ${
                  task.status === "closed"
                    ? "bg-[#DEDCD4]"
                    : locked
                      ? "bg-card"
                      : "border-dashed bg-card"
                } ${dragId === task.id ? "opacity-60" : ""}`}
              >
                {editing?.id === task.id ? (
                  <div className="p-3">
                    <h2 className="mb-3 text-lg font-black">編輯任務 {code}</h2>
                    <TaskEditor
                      slug={slug}
                      initial={task}
                      stayPending
                      onCancel={() => setEditing(null)}
                      onSaved={afterSave}
                    />
                  </div>
                ) : (
                  <div className="relative min-h-[92px] py-3 pr-16 pl-3">
                    {locked ? (
                      <div
                        className="absolute top-1 right-1 flex h-12 w-12 items-center justify-center text-muted"
                        title="已發布，不能再排"
                      >
                        <LockSimple weight="bold" size={26} aria-hidden />
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="拖動調整順序"
                        disabled={busy}
                        onPointerDown={(event) => onPointerDown(task.id, event)}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        className="absolute top-1 right-1 flex h-12 w-12 cursor-grab touch-none items-center justify-center text-ink active:cursor-grabbing disabled:opacity-50"
                      >
                        <DotsSixVertical weight="bold" size={32} aria-hidden />
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${
                          published ? "bg-yellow" : "bg-card"
                        }`}
                      >
                        {taskStatusLabel(task.status)}
                      </span>
                      {locked ? (
                        <span className="text-[11px] font-black tracking-[0.12em] text-muted">
                          不能移動
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 font-black">{shortTaskTitle(task.title)}</div>
                    <p className="mt-1 text-sm whitespace-pre-line">{task.prompt_md}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-11 border-2 border-ink bg-ink px-3 text-sm font-black text-paper disabled:opacity-50"
                        onClick={() => setEditing(task)}
                      >
                        編輯題目
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-11 border-2 border-ink bg-card px-3 text-sm font-black disabled:opacity-50"
                        onClick={() => void mutate("複製中", () => duplicateTask(slug, task.id))}
                      >
                        複製
                      </button>
                      {task.status === "draft" ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="min-h-11 border-2 border-ink bg-card px-3 text-sm font-black disabled:opacity-50"
                          onClick={() => void mutate("刪除中", () => deleteTask(slug, task.id))}
                        >
                          刪除
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
