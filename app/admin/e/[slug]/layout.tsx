import { notFound, redirect } from "next/navigation";
import { AdminEventNav } from "@/components/admin/AdminEventNav";
import { isAdminAuthed } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
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

  return (
    <div>
      <AdminEventNav slug={slug} />
      {children}
    </div>
  );
}
