"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTask,
  duplicateTask,
  importTasksFromEvent,
  moveTask,
} from "@/app/actions/admin";
import { TaskEditor } from "@/components/admin/TaskEditor";
import { Card } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import { adminTaskCodeLabel, shortTaskTitle, taskStatusLabel } from "@/lib/task-utils";
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
  const busyRef = useRef(false);
  busyRef.current = busy;

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

      <div className="space-y-2">
        {tasks.map((task, index) => (
          <Card key={task.id} className="px-3 py-3">
            {editing?.id === task.id ? (
              <div>
                <h2 className="mb-3 text-lg font-black">
                  編輯任務 {adminTaskCodeLabel(task, tasks)}
                </h2>
                <TaskEditor
                  slug={slug}
                  initial={task}
                  stayPending
                  onCancel={() => setEditing(null)}
                  onSaved={afterSave}
                />
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    className="min-h-11 px-2 font-black disabled:text-muted"
                    onClick={() => void mutate("排序中", () => moveTask(slug, task.id, "up"))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === tasks.length - 1}
                    className="min-h-11 px-2 font-black disabled:text-muted"
                    onClick={() => void mutate("排序中", () => moveTask(slug, task.id, "down"))}
                  >
                    ↓
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black tracking-[0.16em] text-muted">
                      任務 {adminTaskCodeLabel(task, tasks)}
                    </span>
                    <span
                      className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${
                        task.status === "published" ? "bg-yellow" : ""
                      }`}
                    >
                      {taskStatusLabel(task.status)}
                    </span>
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
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
