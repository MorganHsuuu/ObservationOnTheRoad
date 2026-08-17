"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [openNotes, setOpenNotes] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

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
            setPickedId(next.id);
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
  const selected = allTasks.find((task) => task.id === pickedId) ?? latest ?? null;

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
            if (banner) setPickedId(banner.id);
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
            tasks={allTasks}
            doneIds={doneIds}
            currentId={latest?.id}
            selectedId={selected?.id}
            onSelect={setPickedId}
          />
        ) : null}

        <div id="current-task">
          {selected && selected.status !== "draft" ? (
            <Card className="hard-shadow overflow-hidden">
              <div className={`px-3.5 py-2 ${selected.id === latest?.id ? "bg-yellow" : "bg-card"}`}>
                <div
                  className={`text-[11px] font-black tracking-[0.2em] ${
                    selected.id === latest?.id ? "text-yellow-deep" : "text-muted"
                  }`}
                >
                  {selected.id === latest?.id ? "目前任務" : selected.status === "closed" ? "已截止" : "可查看"}
                  {" ・ "}
                  {liveTaskCode(selected.id, tasks)}
                  {doneIds.has(selected.id) ? " ・ 已完成" : ""}
                </div>
                <h2 className="text-[26px] leading-tight font-black">
                  {shortTaskTitle(selected.title)}
                </h2>
              </div>
              <div className="px-3.5 py-4">
                <p className="whitespace-pre-line text-[16px] font-medium">{selected.prompt_md}</p>
                {selected.hint ? (
                  <p className="mt-3 border-l-[6px] border-yellow pl-3 text-sm font-medium text-muted">
                    {selected.hint}
                  </p>
                ) : null}
                <div className="mt-4">
                  <UploadForm
                    event={eventState}
                    task={selected}
                    compact
                    onUploaded={() => void load(team)}
                  />
                </div>
              </div>
            </Card>
          ) : selected?.status === "draft" ? (
            <Card className="px-4 py-6">
              <p className="font-black">任務 {taskCode(selected.order_index)} 尚未公布</p>
              <p className="mt-2 text-sm font-medium text-muted">老師一出題，這裡就會出現。</p>
            </Card>
          ) : (
            <Card className="px-4 py-6">
              <p className="font-black">
                {ordered.length > 0
                  ? "現在沒有進行中的任務。左右滑上面的圈圈，點已開放的就能查看。"
                  : "任務還沒開始，先看看今天的故事設定吧"}
              </p>
            </Card>
          )}
        </div>

        {eventState.story_md || eventState.briefing_md ? (
          <Fold
            title={
              eventState.story_md && eventState.briefing_md
                ? "故事與行前說明"
                : eventState.story_md
                  ? "故事設定"
                  : "行前說明"
            }
            open={openNotes}
            onToggle={() => setOpenNotes((value) => !value)}
          >
            {eventState.story_md ? (
              <div>
                {eventState.briefing_md ? (
                  <p className="mb-2 text-[11px] font-black tracking-[0.2em] text-muted">故事設定</p>
                ) : null}
                <Md source={eventState.story_md} />
              </div>
            ) : null}
            {eventState.briefing_md ? (
              <div className={eventState.story_md ? "mt-4 border-t-2 border-ink pt-3" : ""}>
                {eventState.story_md ? (
                  <p className="mb-2 text-[11px] font-black tracking-[0.2em] text-muted">行前說明</p>
                ) : null}
                <Md source={eventState.briefing_md} />
              </div>
            ) : null}
          </Fold>
        ) : null}
      </div>
    </div>
  );
}

function TaskTrack({
  tasks,
  doneIds,
  currentId,
  selectedId,
  onSelect,
}: {
  tasks: TaskRow[];
  doneIds: Set<string>;
  currentId?: string;
  selectedId?: string;
  onSelect: (taskId: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const doneCount = tasks.filter((task) => doneIds.has(task.id)).length;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const id = selectedId ?? currentId;
    if (!scroller || !id) return;
    const node = scroller.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
    if (!node) return;
    const left = node.offsetLeft - scroller.clientWidth / 2 + node.offsetWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [currentId, selectedId, tasks.length]);

  return (
    <Card>
      <div className="flex items-center justify-between border-b-2 border-ink px-3.5 py-2.5">
        <h2 className="text-[13px] font-black tracking-[0.2em] text-muted">任務板</h2>
        <span className="text-[13px] font-black">
          {doneCount}/{tasks.length} 已完成
        </span>
      </div>
      <div
        ref={scrollerRef}
        className="overflow-x-auto overscroll-x-contain px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max flex-nowrap gap-2.5">
          {tasks.map((task) => {
            const done = doneIds.has(task.id);
            const current = task.id === currentId;
            const selected = task.id === selectedId;
            const locked = task.status === "draft";
            const code = taskCode(task.order_index);
            return (
              <button
                key={task.id}
                type="button"
                data-task-id={task.id}
                className="w-[42px] shrink-0 text-center"
                aria-label={
                  locked
                    ? `任務 ${code} 尚未公布`
                    : `任務 ${code}${done ? "，已完成" : current ? "，進行中" : ""}`
                }
                onClick={() => onSelect(task.id)}
              >
                <i
                  className={`mx-auto mb-1 block h-[30px] w-[30px] rounded-full border-2 border-ink ${
                    locked ? "border-dashed" : ""
                  } ${done ? "bg-ink" : current ? "bg-yellow" : selected ? "bg-card" : ""}`}
                />
                <span className={`text-[11px] font-black ${done || current || selected ? "text-ink" : "text-muted"}`}>
                  {code}
                </span>
              </button>
            );
          })}
        </div>
      </div>
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
        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-black"
        onClick={onToggle}
      >
        {title}
        <span className="text-sm text-muted">{open ? "收合" : "展開"}</span>
      </button>
        {open ? <div className="border-t-2 border-ink px-3.5 py-3 text-sm">{children}</div> : null}
    </Card>
  );
}

