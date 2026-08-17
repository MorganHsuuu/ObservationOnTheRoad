import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GalleryView } from "@/components/gallery/GalleryView";
import { EmptyState, Rail } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminTeams, getPublicEvent, getPublicSubmissions, getVisibleTasks } from "@/lib/queries";
import { formatTaipeiDate } from "@/lib/time";

export default async function GalleryPage(props: PageProps<"/e/[slug]/gallery">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  if (!event.gallery_public) {
    return (
      <div className="mx-auto max-w-[540px] px-4 py-16">
        <EmptyState title="成果牆還沒開放，晚點見" body="老師一開，這裡就會出現大家的觀察。" />
        <Link href={`/e/${slug}`} className="mt-6 block text-center font-black">
          回任務板
        </Link>
      </div>
    );
  }

  const [tasks, submissions, teams] = await Promise.all([
    getVisibleTasks(event.id),
    getPublicSubmissions(event.id),
    getAdminTeams(event.id),
  ]);

  return (
    <div className="md:pl-11">
      <Rail text="設計課程 ・ 觀察成果" />
      <div className="mx-auto max-w-[1180px] px-5 pb-24">
        <header className="relative pt-10 pb-6">
          <div className="absolute top-8 left-0 hidden rotate-[-16deg] text-[52px] md:block">✈️</div>
          <h1 className="text-[clamp(48px,11vw,110px)] leading-[0.82] font-black tracking-[-0.02em] md:ml-[70px]">
            路上觀察<span className="align-[-6px] text-[clamp(34px,6vw,64px)]">👀</span>
          </h1>
          <div className="latin mt-1 text-[clamp(22px,4.4vw,44px)] md:ml-[78px]">
            Observation on the road
          </div>
          <dl className="mt-8 flex flex-wrap border-2 border-ink bg-card">
            <Meta label="場域" value={event.location_name ?? "未定"} />
            <Meta label="日期" value={formatTaipeiDate(event.event_date)} />
            <Meta label="任務" value={`${tasks.length} 則`} />
            <Meta label="觀察紀錄" value={`${submissions.length} 筆`} hit />
          </dl>
        </header>
        <Suspense>
          <GalleryView
            submissions={submissions}
            tasks={tasks}
            teams={teams.map(({ id, name }) => ({ id, name, event_id: event.id, code: "", members: null }))}
          />
        </Suspense>
      </div>
    </div>
  );
}

function Meta({ label, value, hit }: { label: string; value: string; hit?: boolean }) {
  return (
    <div className={`min-w-[140px] flex-1 border-r-2 border-ink px-[18px] py-3.5 last:border-r-0 ${hit ? "bg-yellow" : ""}`}>
      <dt className="text-xs font-medium tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[22px] leading-tight font-black">{value}</dd>
    </div>
  );
}
