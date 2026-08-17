"use client";

import { useState } from "react";
import { verifyEventPin } from "@/app/actions/student";
import { Button } from "@/components/ui";
import { writeEventPinUnlocked, writeRememberedEventPin } from "@/lib/remember";
import { digitsOnly } from "@/lib/team-code";

export function EventPinForm({
  slug,
  onVerified,
}: {
  slug: string;
  onVerified: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await verifyEventPin(slug, pin);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    writeRememberedEventPin(slug, pin);
    writeEventPinUnlocked(slug);
    onVerified();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">登入密碼</span>
        <input
          value={pin}
          name="event-pin"
          inputMode="numeric"
          autoComplete="one-time-code"
          onChange={(event) => setPin(digitsOnly(event.target.value).slice(0, 4))}
          placeholder="0000"
          className="h-16 w-full border-2 border-ink bg-card px-4 text-center text-3xl font-black tracking-[0.4em]"
        />
      </label>
      {error ? <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p> : null}
      <Button type="submit" disabled={busy || pin.length !== 4}>
        {busy ? "確認中…" : "進入"}
      </Button>
    </form>
  );
}
