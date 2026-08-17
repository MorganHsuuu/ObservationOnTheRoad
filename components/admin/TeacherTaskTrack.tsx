"use client";

import { useEffect, useRef } from "react";
import { Check } from "@phosphor-icons/react";
import { ProgressPie } from "@/components/ProgressPie";
import { Card } from "@/components/ui";
import { taskPeopleProgress } from "@/lib/progress";
import { boardTaskCode } from "@/lib/task-utils";
import type { ParticipantRow, SubmissionWithMeta, TaskRow } from "@/lib/types";

export function TeacherTaskTrack({
  tasks,
  people,
  submissions,
  currentId,
  selectedId,
  onSelect,
}: {
  tasks: TaskRow[];
  people: ParticipantRow[];
  submissions: SubmissionWithMeta[];
  currentId?: string;
  selectedId?: string;
  onSelect: (taskId: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const id = selectedId ?? currentId;
    if (!scroller || !id) return;
    const node = scroller.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
    if (!node) return;
    const left = node.offsetLeft - scroller.clientWidth / 2 + node.offsetWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [currentId, selectedId, tasks.length]);

  const publishedCount = tasks.filter((task) => task.status !== "draft").length;

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between border-b-2 border-ink px-3.5 py-2.5">
        <h2 className="text-[13px] font-black tracking-[0.2em] text-muted">任務板</h2>
        <span className="text-[13px] font-black">
          {publishedCount}/{tasks.length} 已發布
        </span>
      </div>
      <div
        ref={scrollerRef}
        className="overflow-x-auto overscroll-x-contain px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max flex-nowrap gap-2.5">
          {tasks.map((task) => {
            const locked = task.status === "draft";
            const current = task.id === currentId;
            const selected = task.id === selectedId;
            const { done, total } = taskPeopleProgress(task.id, people, submissions);
            const complete = !locked && total > 0 && done === total;
            const code = boardTaskCode(task.id, tasks);
            return (
              <button
                key={task.id}
                type="button"
                data-task-id={task.id}
                className="w-[44px] shrink-0 text-center"
                aria-label={
                  locked
                    ? `任務 ${code} 尚未公布`
                    : `任務 ${code}${current ? "，發佈中" : task.status === "closed" ? "，已截止" : ""}，${done}/${total || 0} 人已交`
                }
                onClick={() => onSelect(task.id)}
              >
                <span className="relative mx-auto mb-1 flex h-[34px] w-[34px] items-center justify-center">
                  <ProgressPie
                    done={done}
                    total={total}
                    size={34}
                    locked={locked}
                    current={current}
                  />
                  {complete ? (
                    <Check weight="bold" size={16} className="absolute text-ink" aria-hidden />
                  ) : null}
                  {selected ? (
                    <span className="pointer-events-none absolute inset-[-3px] rounded-full border-2 border-ink" />
                  ) : null}
                </span>
                <span
                  className={`text-[11px] font-black ${
                    selected || current || complete ? "text-ink" : "text-muted"
                  }`}
                >
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
