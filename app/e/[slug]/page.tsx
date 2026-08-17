import { notFound } from "next/navigation";
import { EventHome } from "@/components/student/EventHome";
import { isSupabaseConfigured } from "@/lib/env";
import { getPublicEvent, getVisibleTasks } from "@/lib/queries";

export default async function EventPage(props: PageProps<"/e/[slug]">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();
  const tasks = await getVisibleTasks(event.id);
  return <EventHome event={event} initialTasks={tasks} />;
}
