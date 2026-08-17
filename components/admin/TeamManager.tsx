"use client";

import { useState } from "react";
import { deleteTeam, upsertTeam } from "@/app/actions/admin";
import { Button, Card } from "@/components/ui";
import type { TeamRow } from "@/lib/types";

export function TeamManager({ slug, teams }: { slug: string; teams: TeamRow[] }) {
  const [error, setError] = useState("");

  async function onCreate(formData: FormData) {
    const result = await upsertTeam(slug, {
      name: String(formData.get("name") ?? ""),
      code: String(formData.get("code") ?? ""),
      members: String(formData.get("members") ?? "") || null,
    });
    if (!result.ok) setError(result.error);
    else setError("");
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form action={onCreate} className="space-y-3">
          <input name="name" placeholder="第 7 組" required className="h-14 w-full border-2 border-ink px-3 font-black" />
          <input
            name="code"
            placeholder="4 碼代碼"
            required
            maxLength={4}
            className="h-14 w-full border-2 border-ink px-3 font-black uppercase"
          />
          <input name="members" placeholder="成員（選填）" className="h-12 w-full border-2 border-ink px-3" />
          <Button type="submit">新增組別</Button>
        </form>
        {error ? <p className="mt-3 bg-danger px-3 py-3 font-black text-white">{error}</p> : null}
      </Card>

      {teams.map((team) => (
        <Card key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-xl font-black">{team.name}</div>
            <div className="font-black tracking-[0.2em]">{team.code}</div>
            {team.members ? <div className="text-sm text-muted">{team.members}</div> : null}
          </div>
          <button
            type="button"
            className="min-h-11 font-black"
            onClick={() => void deleteTeam(slug, team.id)}
          >
            刪除
          </button>
        </Card>
      ))}
    </div>
  );
}
