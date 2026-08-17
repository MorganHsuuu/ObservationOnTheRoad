"use client";

import { useMemo, useState } from "react";
import { setSubmissionFlags } from "@/app/actions/admin";
import { liveTaskCode, shortTaskTitle } from "@/lib/task-utils";
import { teamLabel } from "@/lib/team-code";
import type { SubmissionWithMeta, TaskRow } from "@/lib/types";
import { sharpImage } from "@/lib/media";

export function CurateGrid({
  slug,
  submissions,
  tasks,
}: {
  slug: string;
  submissions: SubmissionWithMeta[];
  tasks: TaskRow[];
}) {
  const [items, setItems] = useState(submissions);
  const [taskFilter, setTaskFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const rankTasks = useMemo(
    () => (tasks.length > 0 ? tasks : submissions.map((item) => item.task)),
    [submissions, tasks],
  );
  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const item of items) {
      if (item.team) map.set(item.team.id, item.team);
    }
    return [...map.values()];
  }, [items]);

  const list = useMemo(
    () =>
      items.filter((item) => {
        const taskOk = taskFilter === "all" || item.task.id === taskFilter;
        const teamOk = teamFilter === "all" || item.team?.id === teamFilter;
        return taskOk && teamOk;
      }),
    [items, taskFilter, teamFilter],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block min-w-[168px] flex-1">
          <span className="mb-1 block text-[11px] font-black tracking-[0.2em] text-muted">任務</span>
          <select
            value={taskFilter}
            onChange={(event) => setTaskFilter(event.target.value)}
            className="filter-select"
          >
            <option value="all">全部任務</option>
            {rankTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {liveTaskCode(task.id, rankTasks)} {shortTaskTitle(task.title)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[168px] flex-1">
          <span className="mb-1 block text-[11px] font-black tracking-[0.2em] text-muted">組別</span>
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="filter-select"
          >
            <option value="all">全部組別</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {teamLabel(team)}
              </option>
            ))}
          </select>
        </label>
        <p className="ml-auto pb-2 text-[13px] font-black text-muted">
          {list.length} / {items.length}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {list.map((item) => (
          <article key={item.id} className={`border-2 border-ink bg-card ${item.is_hidden ? "opacity-40" : ""}`}>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sharpImage(item)}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-ink/80 px-2.5 py-2 text-paper">
                <p className="text-[11px] font-black tracking-[0.08em] text-yellow">
                  任務 {liveTaskCode(item.task.id, rankTasks)}・{shortTaskTitle(item.task.title)}
                </p>
                <p className="text-sm font-black">{teamLabel(item.team)}</p>
                {item.student_name ? (
                  <p className="text-xs font-black">{item.student_name}</p>
                ) : null}
              </div>
            </div>
            <div className="p-3">
              <p className="font-black">{item.caption}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className={`min-h-11 flex-1 border-2 border-ink font-black ${item.is_featured ? "bg-yellow" : "bg-card"}`}
                  onClick={() => {
                    void setSubmissionFlags(slug, item.id, { is_featured: !item.is_featured });
                    setItems((current) =>
                      current.map((row) =>
                        row.id === item.id ? { ...row, is_featured: !row.is_featured } : row,
                      ),
                    );
                  }}
                >
                  ⭐
                </button>
                <button
                  type="button"
                  className={`min-h-11 flex-1 border-2 border-ink font-black ${item.is_hidden ? "bg-ink text-paper" : "bg-card"}`}
                  onClick={() => {
                    void setSubmissionFlags(slug, item.id, { is_hidden: !item.is_hidden });
                    setItems((current) =>
                      current.map((row) =>
                        row.id === item.id ? { ...row, is_hidden: !row.is_hidden } : row,
                      ),
                    );
                  }}
                >
                  🚫
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
