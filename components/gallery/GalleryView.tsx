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
        teamFilter === "all" ||
        item.team?.code === teamFilter ||
        teamNumber(item.team?.name) === teamFilter;
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
      <section className="sticky top-0 z-30 border-b-2 border-ink bg-paper py-3" aria-label="篩選觀察紀錄">
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
                {team.name}
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
  const team = item.team?.name ?? "未知組別";

  return (
    <div className="relative border-b-2 border-ink bg-[#DEDCD4]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={full ? item.image_urls[0] || sharpImage(item) : sharpImage(item)}
        alt={`${title}／${team}`}
        loading={full ? "eager" : "lazy"}
        decoding="async"
        className={full ? "max-h-[56vh] w-full object-contain" : "block w-full"}
      />
            <div className="absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-paper">
        <p className="text-[11px] font-black tracking-[0.12em] text-yellow">
          任務 {code}・{title}
        </p>
        <p className="text-sm font-black">{team}</p>
      </div>
    </div>
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
