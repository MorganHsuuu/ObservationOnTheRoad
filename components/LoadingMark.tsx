"use client";

import { useId } from "react";

export function LoadingMark({ label = "載入中" }: { label?: string }) {
  const rawId = useId().replace(/:/g, "");
  const pathId = `load-orbit-${rawId}`;
  const ring = Array.from({ length: 12 }, () => label).join("  ·  ") + "  ·  ";

  return (
    <div className="load-stamp" role="status" aria-live="polite" aria-label={label}>
      <svg className="load-stamp-svg" viewBox="0 0 320 148" aria-hidden>
        <rect className="load-stamp-fill" x="38" y="38" width="244" height="72" />
        <path id={pathId} d="M 16 16 H 304 V 132 H 16 Z" fill="none" />
        <text className="load-stamp-text">
          <textPath href={`#${pathId}`} method="align" spacing="auto">
            {ring}
            <animate
              attributeName="startOffset"
              from="0%"
              to="100%"
              dur="14s"
              repeatCount="indefinite"
            />
          </textPath>
        </text>
        <text className="load-stamp-core" x="160" y="78" textAnchor="middle" dominantBaseline="middle">
          {label}
        </text>
      </svg>
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
