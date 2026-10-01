import { notFound } from "next/navigation";
import { TeamManager } from "@/components/admin/TeamManager";
import { SnapshotBook } from "@/components/admin/SnapshotBook";
import {
  getAdminEvent,
  getAdminParticipants,
  getAdminProgressBits,
  getAdminTasks,
  getAdminTeams,
} from "@/lib/queries";
import { keepDailySnapshot } from "@/lib/snapshots";

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
  await keepDailySnapshot(event.id, "roster");
  return (
    <div className="mx-auto max-w-[640px] px-4 pt-8 pb-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black">組別</h1>
          <p className="mt-2 text-sm font-medium text-muted">
            點開一組看成員、完成率。進錯組就改組別，或刪掉後讓學生重新加入。
          </p>
        </div>
        <SnapshotBook slug={slug} kind="roster" />
      </div>
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
