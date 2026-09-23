"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinTeam } from "@/app/actions/student";
import { writeStoredTeam } from "@/lib/team-storage";
import { Button } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import { readRememberedJoin, writeRememberedJoin } from "@/lib/remember";
import { teamLabel } from "@/lib/team-code";
import type { TeamRow } from "@/lib/types";

export function JoinForm({
  slug,
  teams,
}: {
  slug: string;
  teams: Pick<TeamRow, "id" | "name" | "code">[];
}) {
  const router = useRouter();
  const { start, stop } = useNavPending();
  const [code, setCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readRememberedJoin(slug);
      if (saved.code && teams.some((team) => team.code === saved.code)) setCode(saved.code);
      if (saved.studentId) setStudentId(saved.studentId);
      if (saved.studentName) setStudentName(saved.studentName);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug, teams]);

  const ready =
    teams.some((team) => team.code === code) &&
    studentId.trim().length > 0 &&
    studentName.trim().length > 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    start("確認中");
    const result = await joinTeam(slug, {
      code,
      studentId,
      studentName,
    });
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
      return;
    }
    writeStoredTeam(result.data);
    writeRememberedJoin(slug, {
      code: result.data.teamCode,
      studentId: result.data.studentId,
      studentName: result.data.studentName,
    });
    start("進入任務板");
    router.replace(`/e/${slug}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
      <fieldset>
        <legend className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">組別</legend>
        {teams.length === 0 ? (
          <p className="border-2 border-ink bg-card px-4 py-5 font-black">老師還沒開組，請稍後再加入。</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
            {teams.map((team) => {
              const selected = code === team.code;
              return (
                <button
                  key={team.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCode(team.code)}
                  className={`min-h-16 border-2 border-ink text-lg font-black active:bg-yellow ${
                    selected ? "bg-yellow" : "bg-card"
                  }`}
                >
                  {teamLabel(team)}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">學號</span>
        <input
          value={studentId}
          name="student-id"
          autoComplete="username"
          onChange={(event) => setStudentId(event.target.value.slice(0, 32))}
          placeholder="學號"
          className="h-14 w-full border-2 border-ink bg-card px-4 text-lg font-black"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">姓名</span>
        <input
          value={studentName}
          name="student-name"
          autoComplete="name"
          onChange={(event) => setStudentName(event.target.value.slice(0, 40))}
          placeholder="姓名"
          className="h-14 w-full border-2 border-ink bg-card px-4 text-lg font-black"
        />
      </label>
      {error ? (
        <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p>
      ) : null}
      <Button type="submit" disabled={busy || !ready}>
        {busy ? "確認中…" : "進入任務板"}
      </Button>
    </form>
  );
}
