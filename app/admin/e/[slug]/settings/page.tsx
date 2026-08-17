import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
import { SettingsActions } from "@/components/admin/SettingsActions";
import { getAdminEvent } from "@/lib/queries";

export default async function SettingsPage(props: PageProps<"/admin/e/[slug]/settings">) {
  const { slug } = await props.params;
  const event = await getAdminEvent(slug);
  if (!event) notFound();
  return (
    <div className="mx-auto max-w-[640px] px-4 py-6">
      <h1 className="text-4xl font-black">設定</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        截止全部任務、結束活動放在這裡，不放在現場控制台。
      </p>
      <EventForm event={event} />
      <SettingsActions slug={slug} />
    </div>
  );
}
