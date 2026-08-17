import { notFound } from "next/navigation";
import { TaskManager } from "@/components/admin/TaskManager";
import { getAdminEvent, getAdminEvents, getAdminTasks } from "@/lib/queries";

export default async function TasksPage(props: PageProps<"/admin/e/[slug]/tasks">) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  const [tasks, events] = await Promise.all([getAdminTasks(event.id), getAdminEvents()]);
  const editId = typeof search.edit === "string" ? search.edit : undefined;
  return (
    <div className="mx-auto max-w-[720px] px-4 py-6">
      <h1 className="text-4xl font-black">題庫</h1>
      <p className="mt-2 mb-6 text-sm font-medium text-muted">
        全部預設為草稿，學生端看不到。現場再一題一題發布。已發布的題也可以改文字。
      </p>
      <TaskManager
        slug={slug}
        tasks={tasks}
        otherEvents={events.filter((item) => item.id !== event.id)}
        initialEditId={editId}
      />
    </div>
  );
}
