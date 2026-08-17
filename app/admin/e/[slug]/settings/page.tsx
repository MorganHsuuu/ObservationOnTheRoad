import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
import { getAdminEvent } from "@/lib/queries";

export default async function SettingsPage(props: PageProps<"/admin/e/[slug]/settings">) {
  const { slug } = await props.params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  return (
    <div className="mx-auto max-w-[640px] px-4 pt-8 pb-6">
      <h1 className="text-4xl font-black">設定</h1>
      <p className="mt-2 mb-6 text-sm text-muted">活動名稱、地點、日期和後台密碼。</p>
      <EventForm event={event} />
    </div>
  );
}
