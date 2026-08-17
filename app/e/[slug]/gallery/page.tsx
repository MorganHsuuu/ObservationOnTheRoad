import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GalleryView } from "@/components/gallery/GalleryView";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminTeams, getPublicEvent, getPublicSubmissions, getVisibleTasks } from "@/lib/queries";
import { formatTaipeiDate } from "@/lib/time";

export default async function GalleryPage(props: PageProps<"/e/[slug]/gallery">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const [tasks, submissions, teams] = await Promise.all([
    getVisibleTasks(event.id),
    getPublicSubmissions(event.id),
    getAdminTeams(event.id),
  ]);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24">
      <header className="relative pt-10 pb-6">
        <div className="absolute top-8 left-0 hidden rotate-[-16deg] text-[52px] md:block">✈️</div>
        <h1 className="text-[clamp(48px,11vw,110px)] leading-[0.82] font-black tracking-[-0.02em] md:ml-[70px]">
          路上觀察<span className="align-[-6px] text-[clamp(34px,6vw,64px)]">👀</span>
        </h1>
        <div className="latin mt-1 text-[clamp(22px,4.4vw,44px)] md:ml-[78px]">
          Observation on the road
        </div>
        <dl className="mt-8 grid grid-cols-2 overflow-hidden border-2 border-ink bg-card md:grid-cols-4">
          <Meta label="場域" value={event.location_name ?? "未定"} className="border-r-2 border-b-2 border-ink md:border-b-0" />
          <Meta label="日期" value={formatTaipeiDate(event.event_date)} className="border-b-2 border-ink md:border-r-2 md:border-b-0" />
          <Meta label="任務" value={`${tasks.length} 則`} className="border-r-2 border-ink" />
          <Meta label="觀察紀錄" value={`${submissions.length} 筆`} hit />
        </dl>
      </header>
      <Suspense>
        <GalleryView submissions={submissions} tasks={tasks} teams={teams} />
      </Suspense>
    </div>
  );
}

function Meta({
  label,
  value,
  hit,
  className = "",
}: {
  label: string;
  value: string;
  hit?: boolean;
  className?: string;
}) {
  return (
    <div className={`px-[18px] py-3.5 ${hit ? "bg-yellow" : ""} ${className}`}>
      <dt className="text-xs font-medium tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[22px] leading-tight font-black">{value}</dd>
    </div>
  );
}
