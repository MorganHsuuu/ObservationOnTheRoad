import { notFound } from "next/navigation";
import { EventHome } from "@/components/student/EventHome";
import { isSupabaseConfigured } from "@/lib/env";
import { getPublicEvent } from "@/lib/queries";

export default async function EventPage(props: PageProps<"/e/[slug]">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();
  return <EventHome event={event} />;
}
