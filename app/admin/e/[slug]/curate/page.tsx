import { notFound } from "next/navigation";
import { CurateGrid } from "@/components/admin/CurateGrid";
import { getAdminEvent, getAdminSubmissions, getAdminTasks } from "@/lib/queries";

export default async function CuratePage(props: PageProps<"/admin/e/[slug]/curate">) {
  const { slug } = await props.params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  const [submissions, tasks] = await Promise.all([
    getAdminSubmissions(event.id),
    getAdminTasks(event.id),
  ]);
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <h1 className="text-4xl font-black">策展</h1>
      <p className="mt-2 mb-6 text-sm text-muted">點 ⭐ 精選、🚫 隱藏。隱藏的不會出現在成果牆與展覽。</p>
      <CurateGrid slug={slug} submissions={submissions} tasks={tasks} />
    </div>
  );
}
