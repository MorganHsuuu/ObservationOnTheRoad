import Link from "next/link";
import { notFound } from "next/navigation";
import { UploadForm } from "@/components/student/UploadForm";
import { isSupabaseConfigured } from "@/lib/env";
import { getPublicEvent, getVisibleTask, getVisibleTasks } from "@/lib/queries";
import { liveTaskCode, shortTaskTitle } from "@/lib/task-utils";

export default async function TaskPage(props: PageProps<"/e/[slug]/task/[taskId]">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug, taskId } = await props.params;
  const [event, task] = await Promise.all([getPublicEvent(slug), getVisibleTask(taskId)]);
  if (!event || !task || task.event_id !== event.id) notFound();
  const siblings = await getVisibleTasks(event.id);

  return (
    <div className="mx-auto max-w-[540px] px-4 py-6 pb-16">
      <Link href={`/e/${slug}`} className="inline-block text-sm font-black max-md:pl-11">
        ← 回任務板
      </Link>
      <p className="mt-4 text-xs font-black tracking-[0.2em] text-muted">
        任務 {liveTaskCode(task.id, siblings)}
        {task.status === "closed" ? " ・ 已截止" : ""}
      </p>
      <h1 className="mt-1 text-[32px] leading-tight font-black">{shortTaskTitle(task.title)}</h1>
      <p className="mt-3 whitespace-pre-line text-[17px] font-medium">{task.prompt_md}</p>
      {task.hint ? (
        <p className="mt-3 border-l-[6px] border-yellow pl-3 text-sm font-medium text-muted">
          {task.hint}
        </p>
      ) : null}
      <div className="mt-6">
        <UploadForm event={event} task={task} />
      </div>
    </div>
  );
}
