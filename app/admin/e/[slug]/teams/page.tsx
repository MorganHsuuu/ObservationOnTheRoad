import { notFound } from "next/navigation";
import { TeamManager } from "@/components/admin/TeamManager";
import { getAdminEvent, getAdminTeams } from "@/lib/queries";

export default async function TeamsPage(props: PageProps<"/admin/e/[slug]/teams">) {
  const { slug } = await props.params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  const teams = await getAdminTeams(event.id);
  return (
    <div className="mx-auto max-w-[640px] px-4 py-6">
      <h1 className="text-4xl font-black">組別</h1>
      <p className="mt-2 mb-6 text-sm font-medium text-muted">
        學生用 4 碼代碼加入。現場也可以再加一組。
      </p>
      <TeamManager slug={slug} teams={teams} />
    </div>
  );
}
