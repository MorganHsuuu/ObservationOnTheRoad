"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart } from "@phosphor-icons/react";
import { toggleSubmissionLike } from "@/app/actions/student";
import { EmptyState } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/browser";
import { liveTaskCode, shortTaskTitle } from "@/lib/task-utils";
import { sanitizeStudentId, teamLabel } from "@/lib/team-code";
import { readStoredTeam } from "@/lib/team-storage";
import { formatTaipeiTime } from "@/lib/time";
import { sharpImage, tinyImage } from "@/lib/media";
import type { SubmissionLikeRow, SubmissionWithMeta, TaskRow, TeamRow } from "@/lib/types";

export function GalleryView({
  eventId,
  eventSlug,
  submissions,
  tasks,
  teams,
  likes = [],
  featuredFirst = false,
  deepLinkId,
}: {
  eventId: string;
  eventSlug: string;
  submissions: SubmissionWithMeta[];
  tasks: TaskRow[];
  teams: TeamRow[];
  likes?: SubmissionLikeRow[];
  featuredFirst?: boolean;
  deepLinkId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [taskFilter, setTaskFilter] = useState(searchParams.get("task") ?? "all");
  const [teamFilter, setTeamFilter] = useState(searchParams.get("team") ?? "all");
  const [openId, setOpenId] = useState(deepLinkId ?? searchParams.get("s"));
  const [likeRows, setLikeRows] = useState(likes);
  const [guestId, setGuestId] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const storedLiker = useSyncExternalStore(
    emptySubscribe,
    () => readStoredLikerId(eventSlug),
    () => "",
  );
  const likerId = storedLiker || guestId;

  useEffect(() => {
    const supabase = createBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`submission-likes:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submission_likes",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<SubmissionLikeRow> | undefined;
          const submissionId = row?.submission_id;
          const studentId = row?.student_id;
          if (!submissionId || !studentId) return;
          setLikeRows((current) => {
            const without = current.filter(
              (item) => !(item.submission_id === submissionId && item.student_id === studentId),
            );
            if (payload.eventType === "DELETE") return without;
            return [...without, { submission_id: submissionId, student_id: studentId }];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  function setFilter(key: "task" | "team", value: string) {
    const nextTask = key === "task" ? value : taskFilter;
    const nextTeam = key === "team" ? value : teamFilter;
    setTaskFilter(nextTask);
    setTeamFilter(nextTeam);
    const next = new URLSearchParams();
    if (nextTask !== "all") next.set("task", nextTask);
    if (nextTeam !== "all") next.set("team", nextTeam);
    const query = next.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const labeledAll = useMemo(
    () =>
      submissions.map((item) => ({
        ...item,
        team: item.team ?? (item.team_id ? teamMap.get(item.team_id) ?? null : null),
      })),
    [submissions, teamMap],
  );

  const list = useMemo(() => {
    const filtered = labeledAll.filter((item) => {
      const taskOk =
        taskFilter === "all" || liveTaskCode(item.task.id, tasks) === taskFilter;
      const teamOk =
        teamFilter === "all" ||
        item.team?.code === teamFilter ||
        teamNumber(item.team?.name) === teamFilter;
      return taskOk && teamOk;
    });
    if (featuredFirst && taskFilter === "all" && teamFilter === "all") {
      return [...filtered].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return filtered;
  }, [featuredFirst, labeledAll, taskFilter, teamFilter, tasks]);

  const likeState = useMemo(() => {
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const row of likeRows) {
      counts.set(row.submission_id, (counts.get(row.submission_id) ?? 0) + 1);
      if (likerId && row.student_id === likerId) mine.add(row.submission_id);
    }
    return { counts, mine };
  }, [likeRows, likerId]);

  const open = list.find((item) => item.id === openId) ?? labeledAll.find((item) => item.id === openId);

  useEffect(() => {
    if (!openId) return;
    const full = open?.image_urls[0];
    if (!full) return;
    const img = new Image();
    img.src = full;
  }, [open, openId]);

  async function onLike(submissionId: string) {
    if (pendingId === submissionId) return;
    const id = likerId || ensureGuestLiker(eventSlug);
    if (!likerId) setGuestId(id);
    const liked = likeState.mine.has(submissionId);
    setPendingId(submissionId);
    setLikeRows((current) => {
      if (liked) {
        return current.filter(
          (row) => !(row.submission_id === submissionId && row.student_id === id),
        );
      }
      return [...current, { submission_id: submissionId, student_id: id }];
    });
    const result = await toggleSubmissionLike(eventSlug, submissionId, id);
    setPendingId(null);
    if (!result.ok) {
      setLikeRows((current) => {
        if (liked) {
          return [...current, { submission_id: submissionId, student_id: id }];
        }
        return current.filter(
          (row) => !(row.submission_id === submissionId && row.student_id === id),
        );
      });
    }
  }

  return (
    <div>
      <section className="sticky top-11 z-30 border-b-2 border-ink bg-paper py-3" aria-label="篩選觀察紀錄">
        <div className="flex flex-wrap items-end gap-2">
          <FilterSelect
            label="任務"
            value={taskFilter}
            onChange={(value) => setFilter("task", value)}
          >
            <option value="all">全部任務</option>
            {tasks.map((task) => (
              <option key={task.id} value={liveTaskCode(task.id, tasks)}>
                {liveTaskCode(task.id, tasks)} {shortTaskTitle(task.title)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="組別"
            value={teamFilter}
            onChange={(value) => setFilter("team", value)}
          >
            <option value="all">全部組別</option>
            {teams.map((team) => (
              <option key={team.id} value={team.code || teamNumber(team.name)}>
                {teamLabel(team)}
              </option>
            ))}
          </FilterSelect>
          <p className="ml-auto pb-2 text-[13px] font-medium text-muted">
            <b className="text-[15px] font-black text-ink">{list.length}</b> / {submissions.length} 筆
          </p>
        </div>
      </section>

      {list.length === 0 ? (
        <EmptyState title="這個組合還沒有人回傳" body="換一個任務或組別看看" />
      ) : (
        <div className="masonry mt-7">
          {list.map((item) => (
            <article
              key={item.id}
              className="masonry-item cursor-pointer border-2 border-ink bg-card transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_var(--ink)]"
              tabIndex={0}
              onClick={() => setOpenId(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setOpenId(item.id);
              }}
              onMouseEnter={() => {
                if (item.image_urls[0]) {
                  const img = new Image();
                  img.src = item.image_urls[0];
                }
              }}
            >
              <PhotoFrame item={item} tasks={tasks} />
              <div className="px-3.5 pt-3.5 pb-4">
                <p className="text-[17px] leading-snug font-black">
                  {item.is_featured ? <span className="float-right text-sm">⭐</span> : null}
                  {item.caption}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <time className="min-w-0 text-xs font-medium text-muted">
                    {formatTaipeiTime(item.created_at)}
                  </time>
                  <LikeButton
                    liked={likeState.mine.has(item.id)}
                    count={likeState.counts.get(item.id) ?? 0}
                    busy={pendingId === item.id}
                    onToggle={() => void onLike(item.id)}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/90 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="觀察紀錄細節"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenId(null);
          }}
        >
          <div className="w-full max-w-[520px] border-2 border-ink bg-card">
            <PhotoFrame item={open} tasks={tasks} full />
            <div className="px-3.5 py-3.5">
              <p className="font-black">{open.caption}</p>
              {open.student_name ? (
                <p className="mt-1 text-sm font-black text-muted">{open.student_name}</p>
              ) : null}
              <div className="mt-2 flex items-end justify-between gap-3">
                <time className="min-w-0 text-xs text-muted">{formatTaipeiTime(open.created_at)}</time>
                <LikeButton
                  liked={likeState.mine.has(open.id)}
                  count={likeState.counts.get(open.id) ?? 0}
                  busy={pendingId === open.id}
                  onToggle={() => void onLike(open.id)}
                />
              </div>
            </div>
            <button
              type="button"
              className="mx-3.5 mb-4 border-2 border-ink bg-yellow px-4 py-2 font-black"
              onClick={() => setOpenId(null)}
            >
              關閉
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhotoFrame({
  item,
  tasks,
  full = false,
}: {
  item: SubmissionWithMeta;
  tasks: TaskRow[];
  full?: boolean;
}) {
  const code = liveTaskCode(item.task.id, tasks);
  const title = shortTaskTitle(item.task.title);
  const team = teamLabel(item.team);

  return (
    <div className="relative border-b-2 border-ink bg-[#DEDCD4]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={full ? item.image_urls[0] || sharpImage(item) : tinyImage(item) || sharpImage(item)}
        alt={`${title}／${team}${item.student_name ? `／${item.student_name}` : ""}`}
        loading={full ? "eager" : "lazy"}
        decoding="async"
        className={full ? "max-h-[56vh] w-full object-contain" : "block w-full"}
      />
      <div className="absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-paper">
        <p className="text-[11px] font-black tracking-[0.12em] text-yellow">
          任務 {code}・{title}
        </p>
        <p className="text-sm font-black">{team}</p>
        {item.student_name ? <p className="text-xs font-black">{item.student_name}</p> : null}
      </div>
    </div>
  );
}

function LikeButton({
  liked,
  count,
  busy,
  onToggle,
}: {
  liked: boolean;
  count: number;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={liked ? "收回愛心" : "按愛心"}
      aria-pressed={liked}
      disabled={busy}
      className="flex shrink-0 items-center gap-1 leading-none"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Heart
        weight={liked ? "fill" : "regular"}
        size={22}
        className={`block ${liked ? "heart-pop text-danger" : "text-ink"}`}
        aria-hidden
      />
      <span className={`text-[13px] font-black tabular-nums ${liked ? "text-danger" : "text-ink"}`}>
        {count}
      </span>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-[168px] flex-1">
      <span className="mb-1 block text-[11px] font-black tracking-[0.2em] text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="filter-select w-full"
      >
        {children}
      </select>
    </label>
  );
}

function teamNumber(name?: string | null) {
  const match = name?.match(/\d+/);
  return match?.[0] ?? name ?? "";
}

function emptySubscribe() {
  return () => {};
}

function likerKey(slug: string) {
  return `observe:${slug}:liker`;
}

function readStoredLikerId(slug: string) {
  const team = readStoredTeam(slug);
  if (team?.studentId) return sanitizeStudentId(team.studentId);
  return (localStorage.getItem(likerKey(slug)) ?? "").slice(0, 32);
}

function ensureGuestLiker(slug: string) {
  const existing = readStoredLikerId(slug);
  if (existing) return existing;
  const next = `g${crypto.randomUUID().replace(/-/g, "").slice(0, 31)}`;
  localStorage.setItem(likerKey(slug), next);
  return next;
}
