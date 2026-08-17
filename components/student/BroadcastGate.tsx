"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { answerBroadcast, getStudentBroadcast, touchPresence } from "@/app/actions/student";
import { Button } from "@/components/ui";
import { broadcastKindLabel } from "@/lib/broadcast";
import { createBrowserClient } from "@/lib/supabase/browser";
import { readStoredTeam } from "@/lib/team-storage";
import type { BroadcastRow, StoredTeam } from "@/lib/types";

export function BroadcastGate({ slug }: { slug: string }) {
  const pathname = usePathname();
  const [team, setTeam] = useState<StoredTeam | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastRow | null>(null);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (stored: StoredTeam) => {
      const result = await getStudentBroadcast(slug, stored.studentId);
      if (!result.ok) return;
      setBroadcast(result.data.broadcast);
      setAnswered(result.data.answered);
    },
    [slug],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setTeam(readStoredTeam(slug)), 0);
    return () => window.clearTimeout(timer);
  }, [slug, pathname]);

  useEffect(() => {
    if (!team || pathname.endsWith("/join")) return;

    const tick = () => {
      void touchPresence(slug, {
        teamId: team.teamId,
        studentId: team.studentId,
        studentName: team.studentName,
      });
      void load(team);
    };

    const start = window.setTimeout(tick, 0);
    const poll = window.setInterval(tick, 2500);

    const supabase = createBrowserClient();
    const channel = supabase
      ?.channel(`student-broadcast:${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts" },
        () => {
          navigator.vibrate?.(180);
          tick();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_responses" },
        () => tick(),
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [load, pathname, slug, team]);

  if (!team || pathname.endsWith("/join")) return null;
  if (!broadcast || answered) return null;
  const live = broadcast;
  const stored = team;

  async function submit(answer: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await answerBroadcast({
      slug,
      broadcastId: live.id,
      teamId: stored.teamId,
      studentId: stored.studentId,
      studentName: stored.studentName,
      answer,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAnswered(true);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/90 p-4 sm:items-center">
      <div className="w-full max-w-[440px] border-2 border-ink bg-yellow p-5 hard-shadow">
        <p className="text-[11px] font-black tracking-[0.22em] text-yellow-deep">
          老師廣播 ・ {broadcastKindLabel(live.kind)}
        </p>
        <h2 className="mt-2 text-[28px] leading-[1.05] font-black">{live.body}</h2>
        <p className="mt-3 text-sm font-medium">答完才能回到任務。</p>
        {error ? <p className="mt-3 bg-danger px-3 py-2 text-sm font-black text-white">{error}</p> : null}
        <div className="mt-5 space-y-2">
          {live.kind === "ack" ? (
            <Button disabled={busy} onClick={() => void submit("ack")}>
              {busy ? "送出中…" : "了解"}
            </Button>
          ) : null}
          {live.kind === "yesno" ? (
            <>
              <Button disabled={busy} onClick={() => void submit("yes")}>
                是
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => void submit("no")}>
                否
              </Button>
            </>
          ) : null}
          {live.kind === "choice"
            ? live.options.map((option) => (
                <Button key={option} variant="ghost" disabled={busy} onClick={() => void submit(option)}>
                  {option}
                </Button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
