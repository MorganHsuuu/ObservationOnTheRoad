import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { getLiveEvent } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let live = null;
  if (isSupabaseConfigured()) {
    try {
      live = await getLiveEvent();
    } catch {
      live = null;
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-[720px] flex-col justify-center px-5 py-16">
      <div className="rotate-[-16deg] text-[52px]">✈️</div>
      <h1 className="mt-4 text-[clamp(64px,14vw,132px)] leading-[0.82] font-black tracking-[-0.02em]">
        路上觀察<span className="text-[clamp(34px,6vw,64px)]">👀</span>
      </h1>
      <div className="latin mt-2 text-[clamp(24px,5vw,50px)]">Observation on the road</div>
      <p className="mt-8 max-w-md text-lg font-medium">
        即時任務發布、手機拍照回傳、線上成果展覽。
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {live ? (
          <Link
            href={`/e/${live.slug}`}
            className="inline-flex min-h-14 items-center justify-center border-2 border-ink bg-ink px-6 font-black text-paper"
          >
            進入 {live.title}
          </Link>
        ) : (
          <p className="border-2 border-ink bg-card px-4 py-4 font-black">
            現在沒有進行中的場次。
          </p>
        )}
        <Link
          href="/admin"
          className="inline-flex min-h-14 items-center justify-center border-2 border-ink bg-card px-6 font-black"
        >
          老師入口
        </Link>
      </div>
    </main>
  );
}
