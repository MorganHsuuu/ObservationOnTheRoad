"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinTeam } from "@/app/actions/student";
import { writeStoredTeam } from "@/lib/team-storage";
import { Button } from "@/components/ui";

export function JoinForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await joinTeam(slug, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    writeStoredTeam(result.data);
    router.replace(`/e/${slug}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">
          組別代碼
        </span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 4))}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="4 碼"
          className="h-16 w-full border-2 border-ink bg-card px-4 text-center text-3xl font-black tracking-[0.4em] uppercase"
        />
      </label>
      {error ? (
        <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p>
      ) : null}
      <Button type="submit" disabled={busy || code.length !== 4}>
        {busy ? "確認中…" : "加入組別"}
      </Button>
    </form>
  );
}
