import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GalleryView } from "@/components/gallery/GalleryView";
import { EmptyState } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminTeams, getPublicEvent, getPublicSubmissions, getVisibleTasks } from "@/lib/queries";
import { formatTaipeiDate } from "@/lib/time";
import type { Metadata } from "next";

export async function generateMetadata(
  props: PageProps<"/show/[slug]">,
): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "路上觀察" };
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event || !event.show_public) return { title: "展覽準備中" };
  return {
    title: `${event.title}｜路上觀察`,
    description: event.story_md?.slice(0, 120) ?? "路上觀察成果展覽",
    openGraph: {
      title: event.title,
      description: `${event.location_name ?? ""} ${formatTaipeiDate(event.event_date)}`.trim(),
    },
  };
}

export default async function ShowPage(props: PageProps<"/show/[slug]">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const search = await props.searchParams;
  const event = await getPublicEvent(slug);
  if (!event) notFound();
  if (!event.show_public) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-20">
        <EmptyState title="展覽準備中" body="作品牆還沒整理完，晚點再來。" />
      </div>
    );
  }

  const [tasks, submissions, teams] = await Promise.all([
    getVisibleTasks(event.id),
    getPublicSubmissions(event.id),
    getAdminTeams(event.id),
  ]);
  const deepLink = typeof search.s === "string" ? search.s : undefined;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24">
      <header className="relative pt-14 pb-10">
        <div className="absolute top-10 left-0 hidden rotate-[-16deg] text-[52px] md:block">✈️</div>
        <h1 className="text-[clamp(52px,11vw,120px)] leading-[0.82] font-black tracking-[-0.02em] md:ml-[70px]">
          {event.title}
        </h1>
        <div className="latin mt-2 text-[clamp(22px,4vw,40px)] md:ml-[78px]">
          Observation on the road
        </div>
        <p className="mt-8 max-w-2xl text-lg font-medium md:ml-[78px]">
          {event.location_name} ・ {formatTaipeiDate(event.event_date)}
        </p>
        {event.story_md ? (
          <p className="mt-4 max-w-2xl whitespace-pre-line font-medium md:ml-[78px]">
            {event.story_md}
          </p>
        ) : null}
      </header>

      <Suspense>
        <GalleryView
          submissions={submissions}
          tasks={tasks}
          teams={teams}
          featuredFirst
          deepLinkId={deepLink}
        />
      </Suspense>

      <footer className="mt-20 border-t-2 border-ink pt-8">
        <h2 className="text-2xl font-black">關於這門課</h2>
        <p className="mt-3 max-w-xl font-medium">
          路上觀察是一門用重新命名來重新看見的設計課。這次的場域是
          {event.location_name ?? "現場"}，答案不在標示牌上。
        </p>
      </footer>
    </div>
  );
}
