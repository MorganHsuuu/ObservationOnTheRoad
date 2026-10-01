import { notFound } from "next/navigation";
import { SnapshotBook } from "@/components/admin/SnapshotBook";
import { TaskManager } from "@/components/admin/TaskManager";
import { getAdminEvent, getAdminEvents, getAdminTasks } from "@/lib/queries";
import { keepDailySnapshot } from "@/lib/snapshots";

export default async function TasksPage(props: PageProps<"/admin/e/[slug]/tasks">) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  const [tasks, events] = await Promise.all([getAdminTasks(event.id), getAdminEvents()]);
  await keepDailySnapshot(event.id, "tasks");
  const editId = typeof search.edit === "string" ? search.edit : undefined;
  return (
    <div className="mx-auto max-w-[720px] px-4 pt-8 pb-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black">題庫</h1>
          <p className="mt-2 text-sm font-medium text-muted">
            全部預設為草稿，學生端看不到。現場再一題一題發布。已發布的題也可以改文字。
          </p>
        </div>
        <SnapshotBook slug={slug} kind="tasks" />
      </div>
      <TaskManager
        slug={slug}
        tasks={tasks}
        otherEvents={events.filter((item) => item.id !== event.id)}
        initialEditId={editId}
      />
    </div>
  );
}
