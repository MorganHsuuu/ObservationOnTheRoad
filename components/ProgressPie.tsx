export function ProgressPie({
  done,
  total,
  size = 40,
  locked = false,
  current = false,
}: {
  done: number;
  total: number;
  size?: number;
  locked?: boolean;
  current?: boolean;
}) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const fill =
    locked || total === 0
      ? "var(--card)"
      : `conic-gradient(var(--yellow) ${pct}turn, #DEDCD4 ${pct}turn)`;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border-2 ${
        locked ? "border-dashed border-ink bg-card" : current ? "border-yellow" : "border-ink"
      }`}
      style={{ width: size, height: size, background: fill }}
      aria-hidden
    />
  );
}
