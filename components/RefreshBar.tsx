"use client";

export function RefreshBar({
  lastUpdated,
  onRefresh,
  busy,
}: {
  lastUpdated: string;
  onRefresh: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-paper px-4 py-2 text-[13px] font-black">
      <span className="text-muted">最後更新 {lastUpdated}</span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className="min-h-11 px-3 font-black"
      >
        {busy ? "更新中…" : "重新整理"}
      </button>
    </div>
  );
}
