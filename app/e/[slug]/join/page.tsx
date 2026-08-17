import { notFound } from "next/navigation";
import { JoinForm } from "@/components/student/JoinForm";
import { isSupabaseConfigured } from "@/lib/env";
import { getPublicEvent } from "@/lib/queries";
import { formatTaipeiDate } from "@/lib/time";

export default async function JoinPage(props: PageProps<"/e/[slug]/join">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  return (
    <div className="mx-auto flex min-h-full max-w-[540px] flex-col justify-center px-4 py-10">
      <p className="text-xs font-black tracking-[0.2em] text-muted">
        {formatTaipeiDate(event.event_date)}
      </p>
      <h1 className="mt-2 text-[48px] leading-[0.82] font-black tracking-[-0.02em]">加入組別</h1>
      <p className="mt-3 font-medium">{event.title}</p>
      <p className="mt-2 mb-8 text-sm font-medium text-muted">填組別、學號和姓名。這台手機下次會記住。</p>
      <JoinForm slug={slug} />
    </div>
  );
}
