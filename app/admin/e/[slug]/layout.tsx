import { notFound, redirect } from "next/navigation";
import { AdminEventNav } from "@/components/admin/AdminEventNav";
import { AdminEventUnlock } from "@/components/admin/AdminEventUnlock";
import { isAdminAuthed } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { hasAdminEventPinCookie } from "@/lib/event-pin-server";
import { getAdminEvent } from "@/lib/queries";

export default async function AdminEventLayout({
  children,
  params,
}: LayoutProps<"/admin/e/[slug]">) {
  if (!(await isAdminAuthed())) redirect("/admin");
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();

  if (event.entry_pin && !(await hasAdminEventPinCookie(slug))) {
    return <AdminEventUnlock slug={slug} title={event.title} />;
  }

  return (
    <div>
      <AdminEventNav slug={slug} />
      {children}
    </div>
  );
}
