"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudentBoard } from "@/app/actions/student";
import { Md } from "@/components/Markdown";
import { UploadForm } from "@/components/student/UploadForm";
import { Card } from "@/components/ui";
import { PageLoader } from "@/components/LoadingMark";
import { useChromeTools } from "@/components/SiteChrome";
import { createBrowserClient } from "@/lib/supabase/browser";
import { readStoredTeam, clearStoredTeam } from "@/lib/team-storage";
import { currentTask, liveTaskCode, shortTaskTitle, sortTasksByOrder } from "@/lib/task-utils";
import { nowTaipeiLabel, taskCode } from "@/lib/time";
import type { EventRow, StoredTeam, SubmissionRow, TaskRow } from "@/lib/types";

export function EventHome({
  event,
  initialTasks,
}: {
  event: EventRow;
  initialTasks: TaskRow[];
}) {
  const router = useRouter();
  const [team, setTeam] = useState<StoredTeam | null>(null);
  const [booted, setBooted] = useState(false);
  const [eventState, setEventState] = useState(event);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [banner, setBanner] = useState<TaskRow | null>(null);
  const [openStory, setOpenStory] = useState(false);
  const [openBrief, setOpenBrief] = useState(false);

  const load = useCallback(
    async (stored: StoredTeam, silent = false) => {
      if (!silent) setBusy(true);
      const result = await getStudentBoard(event.slug, stored.teamId);
      if (!silent) setBusy(false);
      if (!result.ok) {
        clearStoredTeam(event.slug);
        router.replace(`/e/${event.slug}/join`);
        return;
      }
      setEventState(result.data.event);
      setTasks(result.data.tasks);
      setSubmissions(result.data.submissions);
      setUpdatedAt(nowTaipeiLabel());
    },
    [event.slug, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTeam(readStoredTeam(event.slug));
      setBooted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [event.slug]);

  useEffect(() => {
    if (!booted) return;
    if (!team) {
      router.replace(`/e/${event.slug}/join`);
      return;
    }
    const timer = window.setTimeout(() => {
      void load(team, true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [booted, event.slug, load, router, team]);

  useEffect(() => {
    if (!team) return;
    const supabase = createBrowserClient();
    let poll: number | undefined;

    const startPoll = () => {
      if (poll || !team) return;
      poll = window.setInterval(() => void load(team), 20000);
    };

    if (!supabase) {
      startPoll();
      return () => window.clearInterval(poll);
    }

    const channel = supabase
      .channel(`student-board:${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `event_id=eq.${event.id}` },
        (payload) => {
          const next = payload.new as TaskRow | undefined;
          if (next?.status === "published") {
            setBanner(next);
            navigator.vibrate?.(200);
          }
          if (team) void load(team);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `id=eq.${event.id}` },
        () => {
          if (team) void load(team);
        },
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") startPoll();
      });

    return () => {
      void supabase.removeChannel(channel);
      if (poll) window.clearInterval(poll);
    };
  }, [event.id, load, team]);

  const refresh = useCallback(() => {
    if (team) void load(team);
  }, [load, team]);
  useChromeTools({ onRefresh: team ? refresh : undefined, busy, updatedAt });

  const latest = useMemo(() => currentTask(tasks), [tasks]);
  const allTasks = useMemo(() => sortTasksByOrder(tasks), [tasks]);
  const ordered = useMemo(
    () => allTasks.filter((task) => task.status !== "draft"),
    [allTasks],
  );
  const doneIds = useMemo(() => {
    const mine = submissions.filter(
      (item) => !team?.studentId || !item.student_id || item.student_id === team.studentId,
    );
    return new Set(mine.map((item) => item.task_id));
  }, [submissions, team]);

  if (!booted || !team) {
    return <PageLoader label="載入任務" />;
  }

  return (
    <div className="pb-16">
      {banner ? (
        <button
          type="button"
          onClick={() => {
            setBanner(null);
            document.getElementById("current-task")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="block w-full bg-yellow px-4 py-3 text-center text-base font-black"
        >
          🔔 新任務來了！點我查看
        </button>
      ) : null}

      <div className="mx-auto max-w-[540px] space-y-4 px-4 pt-4">
        {allTasks.length > 0 ? (
          <TaskTrack
            slug={event.slug}
            tasks={allTasks}
            doneIds={doneIds}
            currentId={latest?.id}
          />
        ) : null}

        {eventState.story_md ? (
          <Fold title="故事設定" open={openStory} onToggle={() => setOpenStory((value) => !value)}>
            <Md source={eventState.story_md} />
          </Fold>
        ) : null}

        <div id="current-task">
          {latest ? (
            <Card className="hard-shadow overflow-hidden">
              <div className="bg-yellow px-3.5 py-2">
                <div className="text-[11px] font-black tracking-[0.2em] text-yellow-deep">
                  目前任務 ・ {liveTaskCode(latest.id, tasks)}
                  {doneIds.has(latest.id) ? " ・ 已完成" : ""}
                </div>
                <h2 className="text-[26px] leading-tight font-black">
                  {shortTaskTitle(latest.title)}
                </h2>
              </div>
              <div className="px-3.5 py-4">
                <p className="whitespace-pre-line text-[16px] font-medium">{latest.prompt_md}</p>
                {latest.hint ? (
                  <p className="mt-3 border-l-[6px] border-yellow pl-3 text-sm font-medium text-muted">
                    {latest.hint}
                  </p>
                ) : null}
                <div className="mt-4">
                  <UploadForm
                    event={eventState}
                    task={latest}
                    compact
                    onUploaded={() => void load(team)}
                  />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="px-4 py-6">
              <p className="font-black">
                {ordered.length > 0
                  ? "現在沒有進行中的任務。點上面的圈圈可以查看已開放的題，虛線的還沒公布。"
                  : "任務還沒開始，先看看今天的故事設定吧"}
              </p>
            </Card>
          )}
        </div>

        {ordered.length > 0 ? (
          <section>
            <h2 className="mb-2 text-xs font-black tracking-[0.2em] text-muted">任務清單</h2>
            <Card>
              {ordered.map((task) => {
                const done = doneIds.has(task.id);
                const current = task.id === latest?.id;
                const closed = task.status === "closed";
                const label = closed
                  ? "已截止"
                  : current
                    ? done
                      ? "進行中・已完成"
                      : "進行中"
                    : done
                      ? "已完成・可補交"
                      : "可補交";
                return (
                  <Link
                    key={task.id}
                    href={`/e/${event.slug}/task/${task.id}`}
                    className={`flex items-center gap-3 border-b-2 border-ink px-3.5 py-3 last:border-b-0 ${
                      current ? "bg-yellow" : ""
                    }`}
                  >
                    <span className="w-10 shrink-0 font-black tracking-wider">
                      {liveTaskCode(task.id, tasks)}
                    </span>
                    <span className="min-w-0 flex-1 font-black leading-snug">
                      {shortTaskTitle(task.title)}
                    </span>
                    <span
                      className={`shrink-0 border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${
                        current ? "bg-ink text-paper" : done ? "bg-card" : ""
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </Card>
          </section>
        ) : null}

        {eventState.briefing_md ? (
          <Fold title="行前說明" open={openBrief} onToggle={() => setOpenBrief((value) => !value)}>
            <Md source={eventState.briefing_md} />
          </Fold>
        ) : null}

        <Link
          href={`/e/${event.slug}/gallery`}
          className="flex min-h-14 items-center justify-center border-2 border-ink bg-card text-lg font-black"
        >
          看看大家拍了什麼
        </Link>
      </div>
    </div>
  );
}

function TaskTrack({
  slug,
  tasks,
  doneIds,
  currentId,
}: {
  slug: string;
  tasks: TaskRow[];
  doneIds: Set<string>;
  currentId?: string;
}) {
  const [hint, setHint] = useState("");
  const doneCount = tasks.filter((task) => doneIds.has(task.id)).length;

  return (
    <Card>
      <div className="flex items-center justify-between border-b-2 border-ink px-3.5 py-2.5">
        <h2 className="text-[13px] font-black tracking-[0.2em] text-muted">任務板</h2>
        <span className="text-[13px] font-black">
          {doneCount}/{tasks.length} 已完成
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5 p-3">
        {tasks.map((task) => {
          const done = doneIds.has(task.id);
          const current = task.id === currentId;
          const locked = task.status === "draft";
          const code = taskCode(task.order_index);
          const circle = (
            <>
              <i
                className={`mx-auto mb-1 block h-[30px] w-[30px] rounded-full border-2 border-ink ${
                  locked ? "border-dashed" : ""
                } ${done ? "bg-ink" : current ? "bg-yellow" : ""}`}
              />
              <span className={`text-[11px] font-black ${done || current ? "text-ink" : "text-muted"}`}>
                {code}
              </span>
            </>
          );

          if (locked) {
            return (
              <button
                key={task.id}
                type="button"
                className="w-[42px] text-center"
                aria-label={`任務 ${code} 尚未公布`}
                onClick={() => setHint(`任務 ${code} 尚未公布`)}
              >
                {circle}
              </button>
            );
          }

          return (
            <Link
              key={task.id}
              href={`/e/${slug}/task/${task.id}`}
              className="w-[42px] text-center"
              aria-label={`任務 ${code}${done ? "，已完成" : current ? "，進行中" : ""}`}
              onClick={() => setHint("")}
            >
              {circle}
            </Link>
          );
        })}
      </div>
      {hint ? (
        <p className="border-t-2 border-ink px-3.5 py-2 text-sm font-black">{hint}</p>
      ) : null}
    </Card>
  );
}

function Fold({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between px-3.5 py-3 text-left font-black"
        onClick={onToggle}
      >
        {title}
        <span className="text-sm text-muted">{open ? "收合" : "展開"}</span>
      </button>
      {open ? <div className="border-t-2 border-ink px-3.5 py-3">{children}</div> : null}
    </Card>
  );
}

