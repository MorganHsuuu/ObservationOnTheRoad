"use client";

import { useMemo, useState } from "react";
import { setSubmissionFlags } from "@/app/actions/admin";
import { liveTaskCode } from "@/lib/task-utils";
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
  const rankTasks = useMemo(
    () => (tasks.length > 0 ? tasks : submissions.map((item) => item.task)),
    [submissions, tasks],
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className={`border-2 border-ink bg-card ${item.is_hidden ? "opacity-40" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sharpImage(item)}
            alt=""
            className="aspect-square w-full object-cover"
          />
          <div className="p-3">
            <div className="text-xs font-black text-muted">
              任務 {liveTaskCode(item.task.id, rankTasks)} ・ {item.team?.name}
            </div>
            <p className="mt-1 font-black">{item.caption}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={`min-h-11 flex-1 border-2 border-ink font-black ${item.is_featured ? "bg-yellow" : "bg-card"}`}
                onClick={() => {
                  void setSubmissionFlags(slug, item.id, { is_featured: !item.is_featured });
                  setItems((list) =>
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
                className={`min-h-11 flex-1 border-2 border-ink font-black ${item.is_hidden ? "bg-ink text-paper" : "bg-card"}`}
                onClick={() => {
                  void setSubmissionFlags(slug, item.id, { is_hidden: !item.is_hidden });
                  setItems((list) =>
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
        </article>
      ))}
    </div>
  );
}
