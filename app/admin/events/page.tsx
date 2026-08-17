import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminEvents } from "@/lib/queries";
import { formatTaipeiDate } from "@/lib/time";
import { logoutAdmin } from "@/app/actions/auth";
import { ShareJoinButton } from "@/components/admin/ShareJoinButton";

export default async function EventsPage() {
  if (!(await isAdminAuthed())) redirect("/admin");
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-10">
        <h1 className="text-4xl font-black">還沒接上 Supabase</h1>
        <p className="mt-3 font-medium">
          把 `.env.example` 複製成 `.env.local`，填入網址與金鑰後重開開發伺服器。
        </p>
      </div>
    );
  }

  const events = await getAdminEvents();

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-muted">老師端</p>
          <h1 className="mt-1 text-5xl font-black">場次</h1>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="min-h-11 font-black">
            登出
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/events/new" className="min-h-14 border-2 border-ink bg-ink px-5 py-3 font-black text-paper">
          新增場次
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {events.length === 0 ? (
          <p className="border-2 border-ink bg-card px-4 py-6 font-black">
            還沒有場次。先建立一筆。
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex border-2 border-ink bg-card">
              <Link href={`/admin/e/${event.slug}`} className="min-w-0 flex-1 px-4 py-4">
                <div className="text-xs font-black tracking-[0.2em] text-muted">
                  {event.status} ・ {formatTaipeiDate(event.event_date)}
                </div>
                <div className="mt-1 text-2xl font-black">{event.title}</div>
                <div className="text-sm font-medium text-muted">{event.location_name}</div>
              </Link>
              <ShareJoinButton slug={event.slug} title={event.title} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
