"use client";

import { Button } from "@/components/ui";
import { boardTaskCode, shortTaskTitle } from "@/lib/task-utils";
import type { TaskRow } from "@/lib/types";

export function NewTaskAlert({
  task,
  tasks,
  onView,
}: {
  task: TaskRow;
  tasks: TaskRow[];
  onView: () => void;
}) {
  const code = boardTaskCode(task.id, tasks) || "";
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/90 p-4 sm:items-center">
      <div className="w-full max-w-[440px] border-2 border-ink bg-yellow p-5 hard-shadow">
        <p className="text-[11px] font-black tracking-[0.22em] text-yellow-deep">新任務來了</p>
        <h2 className="mt-2 text-[28px] leading-[1.05] font-black">
          {code ? `任務 ${code}` : "新任務"}
          {task.title ? ` ${shortTaskTitle(task.title)}` : ""}
        </h2>
        {task.prompt_md ? (
          <p className="mt-3 text-[16px] font-medium whitespace-pre-line">{task.prompt_md}</p>
        ) : null}
        <div className="mt-5">
          <Button onClick={onView}>查看</Button>
        </div>
      </div>
    </div>
  );
}
