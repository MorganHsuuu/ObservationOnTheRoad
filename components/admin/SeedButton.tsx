"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedSongshanEvent } from "@/app/actions/admin";

export function SeedButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="min-h-14 border-2 border-ink bg-card px-5 py-3 font-black"
        onClick={async () => {
          setBusy(true);
          setError("");
          const result = await seedSongshanEvent();
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/admin/e/${result.data.slug}`);
        }}
      >
        {busy ? "建立中…" : "匯入松山機場示範場次"}
      </button>
      {error ? <p className="mt-2 text-sm font-black text-danger">{error}</p> : null}
    </div>
  );
}
