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
    const timer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-ink/70 px-8"
      aria-label="這題完成了，點一下繼續"
      onClick={onClose}
    >
      <span className="relative mx-auto block w-[min(72vw,220px)]">
        <span className="done-burst-spark done-burst-spark-a" aria-hidden />
        <span className="done-burst-spark done-burst-spark-b" aria-hidden />
        <span className="done-burst-spark done-burst-spark-c" aria-hidden />
        <span className="done-burst-spark done-burst-spark-d" aria-hidden />
        <span className="done-burst-stamp">
          {code ? <span className="text-[11px] font-black text-yellow-deep">任務 {code}</span> : null}
          <span className="mt-1 block text-[44px] leading-none font-black">完成</span>
        </span>
      </span>
    </button>
  );
}
