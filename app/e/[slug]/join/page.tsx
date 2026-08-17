import { notFound } from "next/navigation";
import { JoinForm } from "@/components/student/JoinForm";
import { isSupabaseConfigured } from "@/lib/env";
import { hasEventPinCookie } from "@/lib/event-pin-server";
import { getPublicEvent } from "@/lib/queries";
import { formatTaipeiDate } from "@/lib/time";

export default async function JoinPage(props: PageProps<"/e/[slug]/join">) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();
  const pinUnlocked = !event.requires_pin || (await hasEventPinCookie(slug));

  return (
    <div className="mx-auto flex min-h-full max-w-[540px] flex-col justify-center px-4 py-10">
      <p className="text-xs font-black tracking-[0.2em] text-muted">
        {formatTaipeiDate(event.event_date)}
      </p>
      <h1 className="mt-2 text-[48px] leading-[0.82] font-black tracking-[-0.02em]">
        {event.requires_pin && !pinUnlocked ? "登入密碼" : "加入組別"}
      </h1>
      <p className="mt-3 font-medium">{event.title}</p>
      {event.requires_pin && !pinUnlocked ? null : (
        <p className="mt-2 mb-8 text-sm font-medium text-muted">
          填組別、學號和姓名。這台手機下次會記住。
        </p>
      )}
      <div className={event.requires_pin && !pinUnlocked ? "mt-8" : ""}>
        <JoinForm slug={slug} requiresPin={event.requires_pin} pinUnlocked={pinUnlocked} />
      </div>
    </div>
  );
}
