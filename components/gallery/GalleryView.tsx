"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui";
import { liveTaskCode, shortTaskTitle } from "@/lib/task-utils";
import { formatTaipeiTime } from "@/lib/time";
import { sharpImage } from "@/lib/media";
import type { SubmissionWithMeta, TaskRow, TeamRow } from "@/lib/types";

export function GalleryView({
  submissions,
  tasks,
  teams,
  featuredFirst = false,
  deepLinkId,
}: {
  submissions: SubmissionWithMeta[];
  tasks: TaskRow[];
  teams: TeamRow[];
  featuredFirst?: boolean;
  deepLinkId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [taskFilter, setTaskFilter] = useState(searchParams.get("task") ?? "all");
  const [teamFilter, setTeamFilter] = useState(searchParams.get("team") ?? "all");
  const [openId, setOpenId] = useState(deepLinkId ?? searchParams.get("s"));

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

  const list = useMemo(() => {
    const filtered = submissions.filter((item) => {
      const taskOk =
        taskFilter === "all" || liveTaskCode(item.task.id, tasks) === taskFilter;
      const teamOk =
        teamFilter === "all" || teamNumber(item.team?.name) === teamFilter;
      return taskOk && teamOk;
    });
    if (featuredFirst && taskFilter === "all" && teamFilter === "all") {
      return [...filtered].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return filtered;
  }, [featuredFirst, submissions, taskFilter, teamFilter, tasks]);

  const open = list.find((item) => item.id === openId) ?? submissions.find((item) => item.id === openId);

  useEffect(() => {
    if (!openId) return;
    const full = open?.image_urls[0];
    if (!full) return;
    const img = new Image();
    img.src = full;
  }, [open, openId]);

  return (
    <div>
      <section className="sticky top-0 z-30 border-b-2 border-ink bg-paper py-4" aria-label="篩選觀察紀錄">
        <FilterRow label="任務">
          <Chip pressed={taskFilter === "all"} onClick={() => setFilter("task", "all")}>
            全部
          </Chip>
          {tasks.map((task) => (
            <Chip
              key={task.id}
              pressed={taskFilter === liveTaskCode(task.id, tasks)}
              onClick={() => setFilter("task", liveTaskCode(task.id, tasks))}
            >
              {liveTaskCode(task.id, tasks)} {shortTaskTitle(task.title)}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="組別">
          <Chip pressed={teamFilter === "all"} onClick={() => setFilter("team", "all")}>
            全部
          </Chip>
          {teams.map((team) => (
            <Chip
              key={team.id}
              pressed={teamFilter === teamNumber(team.name)}
              onClick={() => setFilter("team", teamNumber(team.name))}
            >
              {team.name}
            </Chip>
          ))}
        </FilterRow>
        <p className="mt-3 text-[13px] font-medium text-muted">
          目前顯示 <b className="text-[15px] font-black text-ink">{list.length}</b> / {submissions.length} 筆觀察
        </p>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sharpImage(item)}
                alt=""
                loading="lazy"
                decoding="async"
                className="block w-full border-b-2 border-ink"
              />
              <div className="flex items-center justify-between gap-2 bg-ink px-3 py-1.5 text-paper">
                <span className="text-xs font-black tracking-[0.12em] text-yellow">
                  任務 {liveTaskCode(item.task.id, tasks)}
                </span>
                <span className="text-xs font-black">{item.student_name ?? item.team?.name ?? "未知組別"}</span>
              </div>
              <div className="px-3.5 pt-3.5 pb-4">
                <p className="text-[17px] leading-snug font-black">
                  {item.is_featured ? <span className="float-right text-sm">⭐</span> : null}
                  {item.caption}
                </p>
                <time className="mt-2 block text-xs font-medium text-muted">
                  {formatTaipeiTime(item.created_at)}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="觀察紀錄細節"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenId(null);
          }}
        >
          <div className="w-full max-w-[520px] border-2 border-ink bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.image_urls[0]} alt="" className="max-h-[60vh] w-full object-contain bg-[#DEDCD4]" />
            <div className="flex items-center justify-between bg-ink px-3 py-1.5 text-paper">
              <span className="text-xs font-black text-yellow">
                任務 {liveTaskCode(open.task.id, tasks)}・{shortTaskTitle(open.task.title)}
              </span>
              <span className="text-xs font-black">{open.student_name ?? open.team?.name ?? "未知組別"}</span>
            </div>
            <div className="px-3.5 py-3.5">
              <p className="font-black">{open.caption}</p>
              <time className="mt-2 block text-xs text-muted">{formatTaipeiTime(open.created_at)}</time>
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

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-start gap-3 last:mb-0">
      <div className="shrink-0 pt-2 text-[13px] font-black tracking-[0.2em] text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  pressed,
  children,
  onClick,
}: {
  pressed: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`border-2 border-ink px-3.5 py-1.5 text-sm font-black ${
        pressed ? "bg-yellow shadow-[3px_3px_0_var(--ink)]" : "bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function teamNumber(name?: string | null) {
  const match = name?.match(/\d+/);
  return match?.[0] ?? name ?? "";
}
