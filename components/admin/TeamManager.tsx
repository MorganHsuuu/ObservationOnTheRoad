"use client";

import { useEffect, useRef, useState } from "react";
import { deleteTeam, upsertTeam } from "@/app/actions/admin";
import { Button, Card } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import { digitsOnly, teamLabel } from "@/lib/team-code";
import type { TeamRow } from "@/lib/types";

export function TeamManager({ slug, teams }: { slug: string; teams: TeamRow[] }) {
  const { start, stop } = useNavPending();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    if (!busyRef.current) return;
    stop();
    setBusy(false);
  }, [stop, teams]);

  async function onCreate(formData: FormData) {
    if (busy) return;
    setBusy(true);
    setError("");
    start("新增中");
    const result = await upsertTeam(slug, {
      code: String(formData.get("code") ?? ""),
      members: String(formData.get("members") ?? "") || null,
    });
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
    }
  }

  async function onDelete(teamId: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    start("刪除中");
    const result = await deleteTeam(slug, teamId);
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form action={onCreate} className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">組別</span>
            <input
              name="code"
              placeholder="01"
              required
              disabled={busy}
              inputMode="numeric"
              maxLength={2}
              className="h-14 w-full border-2 border-ink px-3 text-center text-2xl font-black tracking-[0.4em] disabled:opacity-50"
              onInput={(event) => {
                const input = event.currentTarget;
                input.value = digitsOnly(input.value).slice(0, 2);
              }}
            />
          </label>
          <input
            name="members"
            placeholder="成員（選填）"
            disabled={busy}
            className="h-12 w-full border-2 border-ink px-3 disabled:opacity-50"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "處理中…" : "新增組別"}
          </Button>
        </form>
        {error ? <p className="mt-3 bg-danger px-3 py-3 font-black text-white">{error}</p> : null}
      </Card>

      {teams.map((team) => (
        <Card key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-xl font-black">{teamLabel(team)}</div>
            {team.members ? <div className="text-sm text-muted">{team.members}</div> : null}
          </div>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 font-black disabled:opacity-50"
            onClick={() => void onDelete(team.id)}
          >
            刪除
          </button>
        </Card>
      ))}
    </div>
  );
}
