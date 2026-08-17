"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/app/actions/auth";
import { Button } from "@/components/ui";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await loginAdmin(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace("/admin/events");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[440px] flex-col justify-center px-4">
      <p className="text-xs font-black tracking-[0.2em] text-muted">老師端</p>
      <h1 className="mt-2 text-[56px] leading-[0.82] font-black tracking-[-0.02em]">
        路上觀察
      </h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">
            管理密碼
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-16 w-full border-2 border-ink bg-card px-4 text-lg font-black"
          />
        </label>
        {error ? (
          <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p>
        ) : null}
        <Button type="submit" disabled={busy || !password}>
          {busy ? "確認中…" : "進入控制台"}
        </Button>
      </form>
    </div>
  );
}
