"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { answerBroadcast, getStudentBroadcast, touchPresence } from "@/app/actions/student";
import { Button } from "@/components/ui";
import { broadcastKindLabel } from "@/lib/broadcast";
import { createBrowserClient } from "@/lib/supabase/browser";
import { readStoredTeam } from "@/lib/team-storage";
import type { BroadcastRow, StoredTeam } from "@/lib/types";

function sameTeam(a: StoredTeam | null, b: StoredTeam | null) {
  if (!a || !b) return a === b;
  return a.teamId === b.teamId && a.studentId === b.studentId && a.studentName === b.studentName;
}

export function BroadcastGate({ slug }: { slug: string }) {
  const pathname = usePathname();
  const onJoin = pathname.endsWith("/join");
  const [team, setTeam] = useState<StoredTeam | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastRow | null>(null);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eventIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const applyBroadcast = useCallback((live: BroadcastRow | null, hasAnswered: boolean) => {
    setBroadcast(live);
    setAnswered(hasAnswered);
  }, []);

  const load = useCallback(
    async (stored: StoredTeam) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const supabase = createBrowserClient();
        if (supabase) {
          let eventId = eventIdRef.current;
          if (!eventId) {
            const { data: event } = await supabase
              .from("events")
              .select("id")
              .eq("slug", slug)
              .maybeSingle();
            eventId = event?.id ?? null;
            eventIdRef.current = eventId;
          }
          if (!eventId) return;
          const { data: live } = await supabase
            .from("broadcasts")
            .select("*")
            .eq("event_id", eventId)
            .eq("status", "live")
            .maybeSingle();
          if (!live) {
            applyBroadcast(null, false);
            return;
          }
          const { data: response } = await supabase
            .from("broadcast_responses")
            .select("id")
            .eq("broadcast_id", live.id)
            .eq("student_id", stored.studentId)
            .maybeSingle();
          applyBroadcast(live as BroadcastRow, Boolean(response));
          return;
        }

        const result = await getStudentBroadcast(slug, stored.studentId);
        if (!result.ok) return;
        applyBroadcast(result.data.broadcast, result.data.answered);
      } finally {
        loadingRef.current = false;
      }
    },
    [applyBroadcast, slug],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = readStoredTeam(slug);
      setTeam((prev) => (sameTeam(prev, next) ? prev : next));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug, onJoin]);

  useEffect(() => {
    if (!team || onJoin) return;
    const stored = team;
    let cancelled = false;
    let poll = 0;
    let presence = 0;
    const supabase = createBrowserClient();
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    async function start() {
      await load(stored);
      if (cancelled) return;

      void touchPresence(slug, {
        teamId: stored.teamId,
        studentId: stored.studentId,
        studentName: stored.studentName,
      });

      poll = window.setInterval(() => void load(stored), 12000);
      presence = window.setInterval(() => {
        void touchPresence(slug, {
          teamId: stored.teamId,
          studentId: stored.studentId,
          studentName: stored.studentName,
        });
      }, 45000);
      if (cancelled) {
        window.clearInterval(poll);
        window.clearInterval(presence);
        return;
      }

      const eventId = eventIdRef.current;
      if (!supabase || !eventId) return;
      channel = supabase
        .channel(`student-broadcast:${slug}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "broadcasts",
            filter: `event_id=eq.${eventId}`,
          },
          () => {
            navigator.vibrate?.(180);
            void load(stored);
          },
        )
        .subscribe();
    }

    void start();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load(stored);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(presence);
      document.removeEventListener("visibilitychange", onVisible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [load, onJoin, slug, team]);

  if (!team || onJoin) return null;
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
