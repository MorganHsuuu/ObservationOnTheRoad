"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinTeam } from "@/app/actions/student";
import { EventPinForm } from "@/components/student/EventPinForm";
import { writeStoredTeam } from "@/lib/team-storage";
import { Button } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import {
  readEventPinUnlocked,
  readRememberedEventPin,
  readRememberedJoin,
  writeRememberedJoin,
} from "@/lib/remember";
import { digitsOnly, finalizeTeamCode } from "@/lib/team-code";

export function JoinForm({
  slug,
  requiresPin = false,
  pinUnlocked = false,
}: {
  slug: string;
  requiresPin?: boolean;
  pinUnlocked?: boolean;
}) {
  const router = useRouter();
  const { start, stop } = useNavPending();
  const [code, setCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(!requiresPin || pinUnlocked);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readRememberedJoin(slug);
      if (saved.code) setCode(saved.code);
      if (saved.studentId) setStudentId(saved.studentId);
      if (saved.studentName) setStudentName(saved.studentName);
      if (requiresPin && (pinUnlocked || readEventPinUnlocked(slug))) {
        setUnlocked(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pinUnlocked, requiresPin, slug]);

  const ready =
    finalizeTeamCode(code).length === 2 && studentId.trim().length > 0 && studentName.trim().length > 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    start("確認中");
    const result = await joinTeam(slug, {
      code,
      studentId,
      studentName,
      pin: readRememberedEventPin(slug),
    });
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
      if (result.error.includes("密碼")) setUnlocked(false);
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

  if (requiresPin && !unlocked) {
    return (
      <div>
        <p className="mb-6 text-sm font-medium text-muted">先輸入老師給的四碼密碼。</p>
        <EventPinForm
          slug={slug}
          onVerified={() => {
            setUnlocked(true);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
      <label className="block">
        <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">組別</span>
        <input
          value={code}
          name="team-code"
          autoComplete="off"
          onChange={(event) => setCode(digitsOnly(event.target.value).slice(0, 2))}
          inputMode="numeric"
          placeholder="01"
          className="h-16 w-full border-2 border-ink bg-card px-4 text-center text-3xl font-black tracking-[0.4em]"
        />
      </label>
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
