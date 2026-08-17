"use client";

import { useState } from "react";
import { ShareNetwork } from "@phosphor-icons/react";
import { publicJoinUrl } from "@/lib/public-url";

export function ShareJoinButton({ slug, title }: { slug: string; title: string }) {
  const [hint, setHint] = useState("");

  async function share(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const url = publicJoinUrl(slug);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `加入「${title}」`, url });
        setHint("已分享");
        window.setTimeout(() => setHint(""), 1600);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setHint("已複製");
    } catch {
      setHint("複製失敗");
    }
    window.setTimeout(() => setHint(""), 1600);
  }

  return (
    <button
      type="button"
      onClick={(event) => void share(event)}
      aria-label={hint || `分享學生加入連結：${title}`}
      className="flex w-16 shrink-0 flex-col items-center justify-center border-l-2 border-ink bg-card font-black active:bg-yellow"
    >
      <ShareNetwork weight="bold" size={22} aria-hidden />
      <span className="mt-1 text-[10px] leading-none tracking-[0.08em]">
        {hint || "分享"}
      </span>
    </button>
  );
}
