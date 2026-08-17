"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedSongshanEvent } from "@/app/actions/admin";
import { useNavPending } from "@/components/NavigationProvider";

export function SeedButton() {
  const router = useRouter();
  const { start, stop } = useNavPending();
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
          start("建立中");
          const result = await seedSongshanEvent();
          if (!result.ok) {
            setBusy(false);
            stop();
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
