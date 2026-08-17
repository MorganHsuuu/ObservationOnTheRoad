"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyAdminEventPin } from "@/app/actions/admin";
import { Button } from "@/components/ui";
import { digitsOnly } from "@/lib/team-code";

export function AdminEventUnlock({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await verifyAdminEventPin(slug, pin);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col justify-center px-4 py-10">
      <p className="text-xs font-black tracking-[0.2em] text-muted">第二道防線</p>
      <h1 className="mt-2 text-4xl font-black">輸入密碼</h1>
      <p className="mt-3 mb-8 font-medium">{title}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">密碼</span>
          <input
            value={pin}
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            autoFocus
            onChange={(event) => setPin(digitsOnly(event.target.value).slice(0, 4))}
            className="h-16 w-full border-2 border-ink bg-card px-4 text-center text-3xl font-black tracking-[0.4em]"
          />
        </label>
        {error ? <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p> : null}
        <Button type="submit" disabled={busy || pin.length !== 4}>
          {busy ? "確認中…" : "進入控制台"}
        </Button>
      </form>
    </div>
  );
}
