"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { closeBroadcast, getAdminRoom, publishBroadcast } from "@/app/actions/admin";
import { Button, Modal } from "@/components/ui";
import { answerLabel, broadcastKindLabel } from "@/lib/broadcast";
import { createBrowserClient } from "@/lib/supabase/browser";
import { teamLabel } from "@/lib/team-code";
import type {
  BroadcastKind,
  BroadcastResponseRow,
  BroadcastRow,
  ParticipantRow,
  TeamRow,
} from "@/lib/types";

export function BroadcastHorn({
  slug,
  eventId,
  teams,
}: {
  slug: string;
  eventId: string;
  teams: TeamRow[];
}) {
  const [open, setOpen] = useState(false);
  const [broadcast, setBroadcast] = useState<BroadcastRow | null>(null);
  const [responses, setResponses] = useState<BroadcastResponseRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [compose, setCompose] = useState(false);
  const [kind, setKind] = useState<BroadcastKind>("ack");
  const [body, setBody] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    const result = await getAdminRoom(slug);
    if (!result.ok) return;
    setBroadcast(result.data.broadcast);
    setResponses(result.data.responses);
    setParticipants(result.data.participants);
  }, [slug]);

  useEffect(() => {
    const ready = window.setTimeout(() => setMounted(true), 0);
    const start = window.setTimeout(() => void load(), 0);
    let debounce = 0;
    const schedule = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void load(), 200);
    };
    const supabase = createBrowserClient();
    if (!supabase) {
      const poll = window.setInterval(() => void load(), 15000);
      return () => {
        window.clearTimeout(ready);
        window.clearTimeout(start);
        window.clearTimeout(debounce);
        window.clearInterval(poll);
      };
    }
    const channel = supabase
      .channel(`admin-broadcast:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts", filter: `event_id=eq.${eventId}` },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_responses" },
        schedule,
      )
      .subscribe();
    const poll = window.setInterval(() => void load(), 20000);
    return () => {
      window.clearTimeout(ready);
      window.clearTimeout(start);
      window.clearTimeout(debounce);
      void supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [eventId, load]);

  const teamOf = useMemo(() => {
    const map = new Map(teams.map((team) => [team.id, team]));
    return (teamId: string | null) => teamLabel(teamId ? map.get(teamId) : null);
  }, [teams]);

  const answeredIds = useMemo(
    () => new Set(responses.map((item) => item.student_id)),
    [responses],
  );
  const pending = participants.filter((item) => !answeredIds.has(item.student_id));
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of responses) {
      map.set(item.answer, (map.get(item.answer) ?? 0) + 1);
    }
    return map;
  }, [responses]);

  async function publish() {
    setBusy(true);
    setError("");
    const result = await publishBroadcast(slug, { kind, body, options });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBroadcast(result.data);
    setResponses([]);
    setCompose(false);
    setBody("");
    setOptions(["", ""]);
    setKind("ack");
  }

  async function closeLive() {
    if (!broadcast) return;
    setBusy(true);
    const result = await closeBroadcast(slug, broadcast.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBroadcast(null);
    setResponses([]);
  }

  const showForm = compose || !broadcast;
  const answeredCount = responses.length;
  const totalCount = Math.max(participants.length, responses.length);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCompose(false);
          setOpen(true);
        }}
        aria-label={broadcast ? `廣播進行中，已答 ${answeredCount}` : "打開廣播"}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink ${
          broadcast ? "bg-yellow" : "bg-card"
        }`}
      >
        <span className="text-xl leading-none" aria-hidden>
          📢
        </span>
        {broadcast ? (
          <span className="absolute -top-1 -right-1 min-w-5 border-2 border-ink bg-ink px-1 text-[10px] font-black text-paper">
            {answeredCount}
          </span>
        ) : null}
      </button>

      {mounted
        ? createPortal(
            <Modal
              open={open}
              kicker={broadcast ? `進行中・已答 ${answeredCount} / ${totalCount}` : "廣播"}
              title={broadcast && !compose ? broadcast.body : "發一則廣播"}
              onClose={() => {
                setOpen(false);
                setCompose(false);
                setError("");
              }}
            >
        {broadcast && !compose ? (
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] text-muted">
              {broadcastKindLabel(broadcast.kind)}
            </p>
            {broadcast.kind !== "ack" ? (
              <div className="mt-3 space-y-1">
                {(broadcast.kind === "yesno" ? ["yes", "no"] : broadcast.options).map((option) => (
                  <div key={option} className="flex items-center justify-between border-2 border-ink bg-paper px-3 py-2">
                    <span className="font-black">{answerLabel(broadcast.kind, option)}</span>
                    <span className="font-black">{counts.get(option) ?? 0}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
              <div>
                <p className="mb-1 text-[11px] font-black tracking-[0.16em] text-muted">已答</p>
                {responses.length === 0 ? (
                  <p className="text-sm font-medium text-muted">還沒有人</p>
                ) : (
                  responses.map((item) => (
                    <p key={item.id} className="text-sm font-black">
                      <span className="mr-1 font-medium text-muted">{teamOf(item.team_id)}</span>
                      {item.student_name}
                      {broadcast.kind === "ack" ? null : (
                        <span className="ml-1 font-medium text-muted">
                          ・{answerLabel(broadcast.kind, item.answer)}
                        </span>
                      )}
                    </p>
                  ))
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-black tracking-[0.16em] text-muted">未答</p>
                {pending.length === 0 ? (
                  <p className="text-sm font-medium text-muted">
                    {participants.length === 0 ? "還沒有學生登入" : "全部答完"}
                  </p>
                ) : (
                  pending.map((item) => (
                    <p key={item.id} className="text-sm font-black">
                      <span className="mr-1 font-medium text-muted">{teamOf(item.team_id)}</span>
                      {item.student_name}
                    </p>
                  ))
                )}
              </div>
            </div>
            <Button className="mt-4 min-h-11 text-[15px]" variant="ghost" disabled={busy} onClick={() => void closeLive()}>
              結束這一則
            </Button>
            <Button className="mt-2 min-h-11 text-[15px]" variant="yellow" onClick={() => setCompose(true)}>
              再發一則
            </Button>
          </div>
        ) : null}

        {showForm ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void publish();
            }}
          >
            {broadcast ? (
              <p className="bg-yellow px-3 py-2 text-sm font-black">會蓋掉現在這則，沒答的人不用再答舊的。</p>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              {(["ack", "yesno", "choice"] as BroadcastKind[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setKind(item)}
                  className={`min-h-11 border-2 border-ink text-sm font-black ${
                    kind === item ? "bg-ink text-paper" : "bg-card"
                  }`}
                >
                  {broadcastKindLabel(item)}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              required
              placeholder={kind === "ack" ? "例如：十分鐘後在大廳集合" : "題目"}
              className="w-full border-2 border-ink bg-paper p-3 font-black"
            />
            {kind === "choice" ? (
              <div className="space-y-2">
                {options.map((option, index) => (
                  <input
                    key={index}
                    value={option}
                    onChange={(event) =>
                      setOptions((list) => list.map((item, i) => (i === index ? event.target.value : item)))
                    }
                    placeholder={`選項 ${index + 1}`}
                    className="h-12 w-full border-2 border-ink bg-paper px-3 font-black"
                  />
                ))}
                {options.length < 4 ? (
                  <button
                    type="button"
                    className="text-sm font-black underline"
                    onClick={() => setOptions((list) => [...list, ""])}
                  >
                    加一個選項
                  </button>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="bg-danger px-3 py-2 text-sm font-black text-white">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "發布中…" : "發布廣播"}
            </Button>
            {broadcast ? (
              <Button type="button" variant="ghost" className="min-h-11 text-[15px]" onClick={() => setCompose(false)}>
                取消
              </Button>
            ) : null}
          </form>
        ) : null}
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
}
