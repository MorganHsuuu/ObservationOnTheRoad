"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  setEventFlag,
  setEventStatus,
  setSubmissionFlags,
  setTaskStatus,
} from "@/app/actions/admin";
import { TaskEditor } from "@/components/admin/TaskEditor";
import { BlockHead, Button, Card, Modal, Prompt } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/browser";
import { adminTaskCodeLabel, currentTask, liveTaskCode, shortTaskTitle, taskStatusLabel } from "@/lib/task-utils";
import { formatTaipeiTime } from "@/lib/time";
import type {
  EventRow,
  EventStatus,
  SubmissionWithMeta,
  TaskRow,
  TeamRow,
} from "@/lib/types";
import { QrModal } from "@/components/admin/QrModal";

export function AdminConsole({
  event,
  tasks,
  teams,
  submissions,
}: {
  event: EventRow;
  tasks: TaskRow[];
  teams: TeamRow[];
  submissions: SubmissionWithMeta[];
}) {
  const [taskList, setTaskList] = useState(tasks);
  const [feed, setFeed] = useState(submissions);
  const [pendingNew, setPendingNew] = useState(0);
  const online = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
  const offline = !online;
  const [publishing, setPublishing] = useState(false);
  const [confirm, setConfirm] = useState<TaskRow | null>(null);
  const [undo, setUndo] = useState<{ task: TaskRow; left: number } | null>(null);
  const [error, setError] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [progressTaskId, setProgressTaskId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const published = useMemo(() => currentTask(taskList), [taskList]);
  const nextDraft = useMemo(
    () => taskList.find((task) => task.status === "draft"),
    [taskList],
  );
  const activeId = progressTaskId ?? published?.id;
  const doneTeamIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    return new Set(
      feed.filter((item) => item.task_id === activeId && item.team_id).map((item) => item.team_id as string),
    );
  }, [activeId, feed]);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setInterval(() => {
      setUndo((current) => {
        if (!current) return null;
        if (current.left <= 1) return null;
        return { ...current, left: current.left - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [undo]);

  useEffect(() => {
    const supabase = createBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`admin-feed:${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => setPendingNew((count) => count + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [event.id]);

  async function publish(task: TaskRow) {
    if (offline || publishing) return;
    setPublishing(true);
    setError("");
    const result = await setTaskStatus(event.slug, task.id, "published");
    setPublishing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTaskList((list) =>
      list.map((item) =>
        item.id === task.id
          ? { ...item, status: "published", published_at: new Date().toISOString() }
          : item,
      ),
    );
    setProgressTaskId(task.id);
    setUndo({ task, left: 8 });
    setConfirm(null);
  }

  async function revert(task: TaskRow) {
    const result = await setTaskStatus(event.slug, task.id, "draft");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTaskList((list) =>
      list.map((item) =>
        item.id === task.id ? { ...item, status: "draft", published_at: null } : item,
      ),
    );
    setUndo(null);
  }

  async function changeStatus(task: TaskRow, status: TaskRow["status"]) {
    const result = await setTaskStatus(event.slug, task.id, status);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTaskList((list) =>
      list.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status,
              published_at: status === "published" ? new Date().toISOString() : item.published_at,
            }
          : item,
      ),
    );
    setMenuId(null);
  }

  return (
    <div className="pb-20">
      <div
        className={`sticky top-0 z-30 border-b-2 border-ink px-4 py-3 ${
          offline ? "bg-danger text-white" : published ? "bg-yellow" : "bg-paper"
        }`}
      >
        <div className={`text-xs font-black tracking-[0.24em] ${offline ? "text-white" : published ? "text-yellow-deep" : "text-muted"}`}>
          {offline ? "已離線" : published ? "現在發布中" : "尚未發布任務"}
        </div>
        <div className="text-[26px] leading-tight font-black">
          {offline
            ? "動作不會送出"
            : published
              ? `任務 ${liveTaskCode(published.id, taskList)} ${shortTaskTitle(published.title)}`
              : "按下方按鈕開始"}
        </div>
        <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${offline ? "text-white" : "text-yellow-deep"}`}>
          <span className={`inline-block h-2 w-2 rounded-full ${offline ? "bg-white" : "bg-[#1B8A3A]"}`} />
          {offline ? "檢查網路後重試" : `連線正常・${event.title}`}
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 bg-danger px-4 py-3 text-white">
          <p className="font-black">{error}</p>
          <button type="button" className="font-black" onClick={() => setError("")}>
            關閉
          </button>
        </div>
      ) : null}

      <div className="mx-auto max-w-[540px] px-4">
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
          {(["setup", "live", "archived"] as EventStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => void setEventStatus(event.slug, status)}
              className={`min-h-11 border-2 border-ink px-3 ${event.status === status ? "bg-ink text-paper" : "bg-card"}`}
            >
              {status === "setup" ? "籌備" : status === "live" ? "進行中" : "封存"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void setEventFlag(event.slug, "gallery_public", !event.gallery_public)}
            className={`min-h-11 border-2 border-ink px-3 ${event.gallery_public ? "bg-ink text-paper" : "bg-card"}`}
          >
            成果牆 {event.gallery_public ? "開" : "關"}
          </button>
          <button
            type="button"
            onClick={() => void setEventFlag(event.slug, "show_public", !event.show_public)}
            className={`min-h-11 border-2 border-ink px-3 ${event.show_public ? "bg-ink text-paper" : "bg-card"}`}
          >
            展覽 {event.show_public ? "開" : "關"}
          </button>
        </div>

        <Card className="mt-4">
          <BlockHead title="回傳進度" extra={<span className="text-[13px] font-black">{doneTeamIds.size} / {teams.length} 組已回傳</span>} />
          <div className="flex flex-wrap gap-2.5 p-4">
            {teams.map((team) => {
              const done = doneTeamIds.has(team.id);
              return (
                <button key={team.id} type="button" className="w-[46px] bg-transparent p-0 text-center">
                  <i
                    className={`mx-auto mb-1 block h-[34px] w-[34px] rounded-full border-2 border-ink ${done ? "bg-ink" : ""}`}
                  />
                  <span className={`text-[11px] font-black ${done ? "text-ink" : "text-muted"}`}>
                    {team.name.replace("第 ", "").replace(" 組", "")}組
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {nextDraft ? (
          <Card className="mt-4">
            <BlockHead title="下一題" />
            <div className="p-4">
              <div className="text-xs font-black tracking-[0.2em] text-muted">
                題庫 {adminTaskCodeLabel(nextDraft, taskList)}
              </div>
              <h3 className="mt-1 mb-2 text-[22px] font-black">{shortTaskTitle(nextDraft.title)}</h3>
              <Prompt>{nextDraft.prompt_md}</Prompt>
              <Button
                className="mt-4"
                disabled={offline || publishing}
                onClick={() => setConfirm(nextDraft)}
              >
                發布這一題
              </Button>
              <Button
                className="mt-2 min-h-11 text-[15px]"
                variant="ghost"
                onClick={() => setEditing(nextDraft)}
              >
                編輯這一題
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="mt-4">
          <BlockHead
            title="題目清單"
            extra={
              <button
                type="button"
                className="min-h-[34px] border-2 border-ink bg-card px-3 text-[15px] font-black"
                onClick={() => setQrOpen(true)}
              >
                顯示 QR
              </button>
            }
          />
          <div>
            {taskList.map((task) => (
              <div key={task.id} className="relative flex items-center gap-2.5 border-b border-[#DEDCD4] px-3.5 py-3 last:border-b-0">
                <span
                  className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-black tracking-wider ${
                    task.status === "published" ? "bg-ink text-paper" : ""
                  }`}
                >
                  {task.status === "published" ? "已發布" : task.status === "closed" ? "已截止" : "待發布"}
                </span>
                <span className="flex-1 font-black">
                  {adminTaskCodeLabel(task, taskList)} {shortTaskTitle(task.title)}
                </span>
                <span className="text-xs font-black text-muted">
                  {task.status !== "draft"
                    ? `${feed.filter((item) => item.task_id === task.id).length}/${teams.length}`
                    : ""}
                </span>
                <button
                  type="button"
                  className="px-1 text-lg font-black"
                  aria-label="更多動作"
                  onClick={() => setMenuId(menuId === task.id ? null : task.id)}
                >
                  ⋯
                </button>
                {menuId === task.id ? (
                  <div className="absolute top-12 right-3 z-20 min-w-40 border-2 border-ink bg-card">
                    <MenuItem
                      onClick={() => {
                        setEditing(task);
                        setMenuId(null);
                      }}
                    >
                      編輯題目
                    </MenuItem>
                    {task.status === "published" ? (
                      <>
                        <MenuItem onClick={() => void changeStatus(task, "draft")}>收回發布</MenuItem>
                        <MenuItem onClick={() => void changeStatus(task, "closed")}>截止這一題</MenuItem>
                      </>
                    ) : null}
                    {task.status === "draft" ? (
                      <MenuItem onClick={() => setConfirm(task)}>發布</MenuItem>
                    ) : null}
                    {task.status === "closed" ? (
                      <MenuItem onClick={() => void changeStatus(task, "published")}>重新開放</MenuItem>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-4">
          <BlockHead title="即時回傳" extra={<span className="text-[13px] font-black">{feed.length} 筆</span>} />
          {pendingNew > 0 ? (
            <button
              type="button"
              className="w-full bg-yellow py-2.5 text-sm font-black"
              onClick={() => {
                setPendingNew(0);
                window.location.reload();
              }}
            >
              +{pendingNew} 張新照片 ↑
            </button>
          ) : null}
          <div>
            {feed.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 border-b border-[#DEDCD4] px-3.5 py-2.5 last:border-b-0">
                <div className="h-[52px] w-[52px] shrink-0 overflow-hidden border-2 border-ink bg-[#DEDCD4]">
                  {item.thumb_urls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumb_urls[0]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-black tracking-wider text-muted">
                    {item.team?.name ?? "未知"}・{formatTaipeiTime(item.created_at)}
                  </div>
                  <div className="mt-0.5 text-sm font-black leading-snug">{item.caption}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={`p-1 text-[15px] ${item.is_featured ? "" : "opacity-25"}`}
                    onClick={() => {
                      void setSubmissionFlags(event.slug, item.id, { is_featured: !item.is_featured });
                      setFeed((list) =>
                        list.map((row) =>
                          row.id === item.id ? { ...row, is_featured: !row.is_featured } : row,
                        ),
                      );
                    }}
                  >
                    ⭐
                  </button>
                  <button
                    type="button"
                    className={`p-1 text-[15px] ${item.is_hidden ? "" : "opacity-25"}`}
                    onClick={() => {
                      void setSubmissionFlags(event.slug, item.id, { is_hidden: !item.is_hidden });
                      setFeed((list) =>
                        list.map((row) =>
                          row.id === item.id ? { ...row, is_hidden: !row.is_hidden } : row,
                        ),
                      );
                    }}
                  >
                    🚫
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {undo ? (
        <div className="sticky bottom-0 z-[31] flex items-center justify-between gap-2.5 bg-ink px-3.5 py-3 text-paper">
          <p className="text-sm font-black">
            {undo.task.title} 已發布・{undo.left} 秒內可收回
          </p>
          <button
            type="button"
            className="bg-yellow px-3.5 py-2 text-sm font-black text-ink"
            onClick={() => void revert(undo.task)}
          >
            收回
          </button>
        </div>
      ) : null}

      <Modal
        open={Boolean(editing)}
        kicker={editing ? `任務 ${adminTaskCodeLabel(editing, taskList)}・${taskStatusLabel(editing.status)}` : ""}
        title={editing ? "編輯題目" : ""}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <TaskEditor
            key={editing.id}
            slug={event.slug}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={(draft) => {
              setTaskList((list) =>
                list.map((item) =>
                  item.id === editing.id
                    ? {
                        ...item,
                        title: draft.title,
                        prompt_md: draft.prompt_md,
                        hint: draft.hint,
                        requires_caption: draft.requires_caption,
                        max_photos: draft.max_photos,
                      }
                    : item,
                ),
              );
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        kicker="確認發布"
        title={confirm ? confirm.title : ""}
        onClose={() => setConfirm(null)}
      >
        {confirm ? <Prompt>{confirm.prompt_md}</Prompt> : null}
        <div className="mt-3.5 bg-yellow px-3 py-2.5 text-sm font-black">
          將立即推送給現場學生
        </div>
        <Button className="mt-4" disabled={publishing} onClick={() => confirm && void publish(confirm)}>
          確定發布
        </Button>
        <Button className="mt-2 min-h-11 text-[15px]" variant="ghost" onClick={() => setConfirm(null)}>
          取消
        </Button>
      </Modal>

      <QrModal open={qrOpen} slug={event.slug} onClose={() => setQrOpen(false)} />
    </div>
  );
}

function MenuItem({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className="block w-full px-3 py-3 text-left font-black" onClick={onClick}>
      {children}
    </button>
  );
}
