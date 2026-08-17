"use client";

import { useEffect } from "react";

export function DoneBurst({
  code,
  onClose,
}: {
  code?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    navigator.vibrate?.([50, 40, 90]);
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
    // 蓋章只在出現時跑一次，不要因 onClose 重綁而重播
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-ink/75 px-6"
      aria-label="這題完成了，點一下繼續"
      onClick={onClose}
    >
      <span className="relative block w-full max-w-[320px]">
        <span className="done-burst-spark done-burst-spark-a" aria-hidden />
        <span className="done-burst-spark done-burst-spark-b" aria-hidden />
        <span className="done-burst-spark done-burst-spark-c" aria-hidden />
        <span className="done-burst-spark done-burst-spark-d" aria-hidden />
        <span className="done-burst-stamp">
          <span className="text-[13px] font-black tracking-[0.28em]">任務 {code || "完成"}</span>
          <span className="mt-1 block text-[72px] leading-[0.8] font-black tracking-[-0.04em]">完成</span>
          <span className="mt-3 block text-sm font-black">收進成果牆了</span>
          <span className="mt-4 block text-[11px] font-black tracking-[0.18em] text-yellow-deep">
            點一下繼續
          </span>
        </span>
      </span>
    </button>
  );
}
