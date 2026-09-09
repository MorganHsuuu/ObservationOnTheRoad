import { notFound } from "next/navigation";
import { TeamManager } from "@/components/admin/TeamManager";
import {
  getAdminEvent,
  getAdminParticipants,
  getAdminProgressBits,
  getAdminTasks,
  getAdminTeams,
} from "@/lib/queries";

export default async function TeamsPage(props: PageProps<"/admin/e/[slug]/teams">) {
  const { slug } = await props.params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  const [teams, tasks, submissions, participants] = await Promise.all([
    getAdminTeams(event.id),
    getAdminTasks(event.id),
    getAdminProgressBits(event.id),
    getAdminParticipants(event.id),
  ]);
  return (
    <div className="mx-auto max-w-[640px] px-4 pt-8 pb-6">
      <h1 className="text-4xl font-black">組別</h1>
      <p className="mt-2 mb-6 text-sm font-medium text-muted">
        點開一組看成員。進錯組就改組別，或刪掉後讓學生重新加入。
      </p>
      <TeamManager
        slug={slug}
        teams={teams}
        tasks={tasks}
        submissions={submissions}
        participants={participants}
      />
    </div>
  );
}
