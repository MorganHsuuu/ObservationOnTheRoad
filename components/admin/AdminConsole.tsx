"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getAdminLive, getAdminRoom, setSubmissionFlags, setTaskStatus } from "@/app/actions/admin";
import { TaskEditor } from "@/components/admin/TaskEditor";
import { TeacherTaskTrack } from "@/components/admin/TeacherTaskTrack";
import { ProgressPie } from "@/components/ProgressPie";
import { BlockHead, Button, Card, Modal, Prompt } from "@/components/ui";
import { useChromeTools } from "@/components/SiteChrome";
import { createBrowserClient } from "@/lib/supabase/browser";
import { adminTaskCodeLabel, arrangeAfterDraft, arrangeAfterPublish, boardTaskCode, currentTask, liveTaskCode, shortTaskTitle, taskStatusLabel } from "@/lib/task-utils";
import { teamLabel } from "@/lib/team-code";
import { teamTaskProgress } from "@/lib/progress";
import { formatTaipeiTime, nowTaipeiLabel } from "@/lib/time";
import type {
  EventRow,
  ParticipantRow,
  SubmissionWithMeta,
  TaskRow,
  TeamRow,
} from "@/lib/types";
import { BroadcastHorn } from "@/components/admin/BroadcastPanel";
import { QrModal } from "@/components/admin/QrModal";
import { StudentRoster } from "@/components/admin/StudentRoster";

export function AdminConsole({
  event,
  tasks,
  teams,
  submissions,
  participants,
}: {
  event: EventRow;
  tasks: TaskRow[];
  teams: TeamRow[];
  submissions: SubmissionWithMeta[];
  participants: ParticipantRow[];
}) {
  const [taskList, setTaskList] = useState(tasks);
  const [teamList, setTeamList] = useState(teams);
  const [feed, setFeed] = useState(submissions);
  const [people, setPeople] = useState(participants);
  const [pendingNew, setPendingNew] = useState(0);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
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
  const selected =
    taskList.find((task) => task.id === (progressTaskId ?? published?.id)) ??
    taskList[0] ??
    null;
  const activeId = selected?.id;
  const doneTeamIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    return new Set(
      feed.filter((item) => item.task_id === activeId && item.team_id).map((item) => item.team_id as string),
    );
  }, [activeId, feed]);

  const loadLive = useCallback(async () => {
    setBusy(true);
    const [live, room] = await Promise.all([getAdminLive(event.slug), getAdminRoom(event.slug)]);
    setBusy(false);
    if (!live.ok) {
      setError(live.error);
      return;
    }
    setTaskList(live.data.tasks);
    setTeamList(live.data.teams);
    setFeed(live.data.submissions);
    if (room.ok) setPeople(room.data.participants);
    setPendingNew(0);
    setUpdatedAt(nowTaipeiLabel());
  }, [event.slug]);

  const refresh = useCallback(() => {
    void loadLive();
  }, [loadLive]);
  useChromeTools({ onRefresh: refresh, busy, updatedAt });

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
    setTaskList((list) => {
      const next = list.map((item) =>
        item.id === task.id
          ? { ...item, status: "published" as const, published_at: new Date().toISOString() }
          : item,
      );
      return arrangeAfterPublish(next, task.id).map((item, index) => ({
        ...item,
        order_index: index + 1,
      }));
    });
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
    setTaskList((list) => {
      const next = list.map((item) =>
        item.id === task.id ? { ...item, status: "draft" as const, published_at: null } : item,
      );
      return arrangeAfterDraft(next, task.id).map((item, index) => ({
        ...item,
        order_index: index + 1,
      }));
    });
    setUndo(null);
  }

  async function changeStatus(task: TaskRow, status: TaskRow["status"]) {
    const result = await setTaskStatus(event.slug, task.id, status);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTaskList((list) => {
      const next = list.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status,
              published_at: status === "published" ? new Date().toISOString() : item.published_at,
            }
          : item,
      );
      if (status === "published") {
        return arrangeAfterPublish(next, task.id).map((item, index) => ({
          ...item,
          order_index: index + 1,
        }));
      }
      if (status === "draft") {
        return arrangeAfterDraft(next, task.id).map((item, index) => ({
          ...item,
          order_index: index + 1,
        }));
      }
      return next;
    });
    setMenuId(null);
  }

  return (
    <div className="pb-20">
      <div
        className={`sticky top-11 z-30 border-b-2 border-ink px-4 pt-5 pb-4 ${
          offline ? "bg-danger text-white" : published ? "bg-yellow" : "bg-paper"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
              {offline ? "檢查網路後重試" : event.title}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <BroadcastHorn slug={event.slug} eventId={event.id} teams={teamList} />
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-card text-sm font-black"
              aria-label="顯示 QR"
            >
              QR
            </button>
          </div>
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

      <div className="mx-auto max-w-[640px] px-4">
        <TeacherTaskTrack
          tasks={taskList}
          people={people}
          submissions={feed}
          currentId={published?.id}
          selectedId={selected?.id}
          onSelect={(taskId) => {
            setProgressTaskId(taskId);
            setMenuId(null);
          }}
        />

        {selected ? (
          <Card className="mt-4">
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[11px] font-black tracking-[0.2em] text-muted">
                  {selected.status === "published"
                    ? "發布中"
                    : selected.status === "closed"
                      ? "已截止"
                      : "尚未公布"}
                  {" ・ "}
                  {boardTaskCode(selected.id, taskList)}
                </div>
                <h2 className="mt-0.5 text-[22px] leading-tight font-black">
                  {shortTaskTitle(selected.title)}
                </h2>
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="px-1 text-lg font-black"
                  aria-label="更多動作"
                  onClick={() => setMenuId(menuId === selected.id ? null : selected.id)}
                >
                  ⋯
                </button>
                {menuId === selected.id ? (
                  <div className="absolute top-8 right-0 z-20 min-w-40 border-2 border-ink bg-card">
                    <MenuItem
                      onClick={() => {
                        setEditing(selected);
                        setMenuId(null);
                      }}
                    >
                      編輯題目
                    </MenuItem>
                    {selected.status === "published" ? (
                      <>
                        <MenuItem onClick={() => void changeStatus(selected, "draft")}>收回發布</MenuItem>
                        <MenuItem onClick={() => void changeStatus(selected, "closed")}>截止這一題</MenuItem>
                      </>
                    ) : null}
                    {selected.status === "draft" ? (
                      <MenuItem onClick={() => setConfirm(selected)}>發布</MenuItem>
                    ) : null}
                    {selected.status === "closed" ? (
                      <MenuItem onClick={() => void changeStatus(selected, "published")}>重新開放</MenuItem>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="p-4">
              <Prompt>{selected.prompt_md}</Prompt>
              {selected.status === "draft" ? (
                <Button
                  className="mt-4"
                  disabled={offline || publishing}
                  onClick={() => setConfirm(selected)}
                >
                  發布這一題
                </Button>
              ) : null}
              <Button
                className={`${selected.status === "draft" ? "mt-2" : "mt-4"} min-h-11 text-[15px]`}
                variant={selected.status === "draft" ? "ghost" : "primary"}
                onClick={() => setEditing(selected)}
              >
                編輯這一題
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="mt-4">
          <div className="flex items-center justify-between border-b-2 border-ink px-3.5 py-2.5">
            <h2 className="text-[13px] font-black tracking-[0.2em] text-muted">各組進度</h2>
            <span className="text-[13px] font-black">
              {doneTeamIds.size}/{teamList.length} 組有人交
            </span>
          </div>
          {teamList.length === 0 ? (
            <p className="px-4 py-5 text-sm font-medium text-muted">先到組別頁加上 01、02。</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-4">
              {teamList.map((team) => {
                const { done, total } = teamTaskProgress(team.id, activeId ?? null, people, feed);
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={team.id} className="flex flex-col items-center gap-1.5 py-1">
                    <ProgressPie done={done} total={total} size={52} current={Boolean(activeId) && doneTeamIds.has(team.id)} />
                    <span className="text-[13px] font-black">{teamLabel(team)}</span>
                    <span className="text-[11px] font-black text-muted">
                      {total > 0 ? `${done}/${total}・${pct}%` : "還沒加入"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <StudentRoster
          slug={event.slug}
          eventId={event.id}
          teams={teamList}
          tasks={taskList}
          submissions={feed}
          people={people}
          refreshToken={updatedAt}
        />

        <Card className="mt-4">
          <BlockHead title="即時回傳" extra={<span className="text-[13px] font-black">{feed.length} 筆</span>} />
          {pendingNew > 0 ? (
            <button
              type="button"
              className="w-full bg-yellow py-2.5 text-sm font-black"
              onClick={() => {
                setPendingNew(0);
                void loadLive();
              }}
            >
              +{pendingNew} 張新照片 ↑
            </button>
          ) : null}
          <div className="max-h-72 overflow-y-auto">
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
                    {teamLabel(item.team)}
                  </div>
                  {item.student_name ? (
                    <div className="text-xs font-black">{item.student_name}</div>
                  ) : null}
                  <div className="mt-0.5 text-sm font-black leading-snug">{item.caption}</div>
                  <div className="mt-0.5 text-xs font-medium text-muted">
                    {formatTaipeiTime(item.created_at)}
                  </div>
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
