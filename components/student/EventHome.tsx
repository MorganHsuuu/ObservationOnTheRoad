"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudentBoard } from "@/app/actions/student";
import { Md } from "@/components/Markdown";
import { RefreshBar } from "@/components/RefreshBar";
import { UploadForm } from "@/components/student/UploadForm";
import { Card } from "@/components/ui";
import { PageLoader } from "@/components/LoadingMark";
import { useNavPending } from "@/components/NavigationProvider";
import { createBrowserClient } from "@/lib/supabase/browser";
import { clearStoredTeam, readStoredTeam } from "@/lib/team-storage";
import { currentTask, liveTaskCode, shortTaskTitle, sortTasksByOrder } from "@/lib/task-utils";
import { formatTaipeiDate, nowTaipeiLabel } from "@/lib/time";
import type { EventRow, StoredTeam, SubmissionRow, TaskRow } from "@/lib/types";

export function EventHome({ event }: { event: EventRow }) {
  const router = useRouter();
  const { start } = useNavPending();
  const [team, setTeam] = useState<StoredTeam | null>(null);
  const [booted, setBooted] = useState(false);
  const [ready, setReady] = useState(false);
  const [eventState, setEventState] = useState(event);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(nowTaipeiLabel());
  const [banner, setBanner] = useState<TaskRow | null>(null);
  const [openStory, setOpenStory] = useState(false);
  const [openBrief, setOpenBrief] = useState(false);

  const load = useCallback(
    async (stored: StoredTeam) => {
      setBusy(true);
      const result = await getStudentBoard(event.slug, stored.teamId);
      setBusy(false);
      setUpdated(nowTaipeiLabel());
      if (!result.ok) {
        clearStoredTeam(event.slug);
        router.replace(`/e/${event.slug}/join`);
        return;
      }
      setEventState(result.data.event);
      setTasks(result.data.tasks);
      setSubmissions(result.data.submissions);
      setReady(true);
    },
    [event.slug, router],
  );

  useEffect(() => {
    const stored = readStoredTeam(event.slug);
    const timer = window.setTimeout(() => {
      setTeam(stored);
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
      void load(team);
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
      .channel(`student-tasks:${event.id}`)
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
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") startPoll();
      });

    return () => {
      void supabase.removeChannel(channel);
      if (poll) window.clearInterval(poll);
    };
  }, [event.id, load, team]);

  const latest = useMemo(() => currentTask(tasks), [tasks]);
  const ordered = useMemo(() => sortTasksByOrder(tasks), [tasks]);
  const doneIds = useMemo(
    () => new Set(submissions.map((item) => item.task_id)),
    [submissions],
  );

  if (!booted || !team || !ready) {
    return <PageLoader label="載入任務" />;
  }

  return (
    <div className="pb-16">
      <RefreshBar
        lastUpdated={updated}
        busy={busy}
        onRefresh={() => void load(team)}
      />

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

      <div className="mx-auto max-w-[540px] space-y-4 px-4 pt-5">
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.2em] text-muted">
              {formatTaipeiDate(event.event_date)}
              {event.location_name ? ` ・ ${event.location_name}` : ""}
            </p>
            <h1 className="mt-1 text-[36px] leading-[0.86] font-black tracking-[-0.02em]">
              {event.title}
            </h1>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-black tracking-[0.18em] text-muted">
              {team.teamCode} {team.teamName}
            </div>
            <div className="text-sm font-black">{team.studentName}</div>
            <div className="text-[11px] font-black text-muted">{team.studentId}</div>
            <button
              type="button"
              className="text-xs font-black text-muted underline"
              onClick={() => {
                start("切換組別");
                clearStoredTeam(event.slug);
                router.replace(`/e/${event.slug}/join`);
              }}
            >
              換組別
            </button>
          </div>
        </header>

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
                  ? "現在沒有進行中的任務。下面清單還可以補交或查看已截止的題。"
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

        {eventState.gallery_public ? (
          <Link
            href={`/e/${event.slug}/gallery`}
            className="flex min-h-14 items-center justify-center border-2 border-ink bg-card text-lg font-black"
          >
            看看大家拍了什麼
          </Link>
        ) : null}
      </div>
    </div>
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

