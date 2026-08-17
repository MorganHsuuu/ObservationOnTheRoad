import { notFound } from "next/navigation";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { getAdminEvent, getAdminSubmissions, getAdminTasks, getAdminTeams } from "@/lib/queries";

export default async function ConsolePage(props: PageProps<"/admin/e/[slug]">) {
  const { slug } = await props.params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  const [tasks, teams, submissions] = await Promise.all([
    getAdminTasks(event.id),
    getAdminTeams(event.id),
    getAdminSubmissions(event.id),
  ]);
  return (
    <AdminConsole event={event} tasks={tasks} teams={teams} submissions={submissions} />
  );
}
