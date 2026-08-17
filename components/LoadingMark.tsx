export function LoadingMark({ label = "載入中" }: { label?: string }) {
  return (
    <div
      className="float-card border-2 border-ink bg-yellow px-8 py-5 text-xl font-black hard-shadow"
      role="status"
      aria-live="polite"
    >
      {label}…
    </div>
  );
}

export function LoadingOverlay({ label = "載入中" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex cursor-wait items-center justify-center bg-ink/35">
      <LoadingMark label={label} />
    </div>
  );
}

export function PageLoader({ label = "載入中" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <LoadingMark label={label} />
    </div>
  );
}
