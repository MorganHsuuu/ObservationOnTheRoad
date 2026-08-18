"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudentBoard, prepareSubmissionUpload, uploadSubmission } from "@/app/actions/student";
import { DoneBurst } from "@/components/student/DoneBurst";
import { Button, Card } from "@/components/ui";
import { compressForUpload } from "@/lib/compress";
import { putFileWithProgress } from "@/lib/direct-upload";
import { readStoredTeam } from "@/lib/team-storage";
import { uploadAllowed } from "@/lib/task-utils";
import { sharpImage, tinyImage } from "@/lib/media";
import type { EventRow, SubmissionRow, TaskRow } from "@/lib/types";

export function UploadForm({
  event,
  task,
  compact = false,
  onUploaded,
  code,
  known = null,
}: {
  event: EventRow;
  task: TaskRow;
  compact?: boolean;
  onUploaded?: (firstTime: boolean) => void;
  code?: string;
  known?: SubmissionRow | null;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<SubmissionRow[]>(() => (known ? [known] : []));
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [shownProgress, setShownProgress] = useState(0);
  const [boardTask, setBoardTask] = useState<TaskRow | null>(null);
  const prepRef = useRef<{
    file: File;
    pair: Promise<Awaited<ReturnType<typeof compressForUpload>>>;
    slot?: ReturnType<typeof prepareSubmissionUpload>;
  } | null>(null);
  const coordsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const liveTask = boardTask?.id === task.id ? boardTask : task;
  const closed = liveTask.status === "closed";
  const canUpload = uploadAllowed(liveTask);
  const existing = useMemo(() => {
    const team = readStoredTeam(event.slug);
    const mineOnly = team?.studentId
      ? mine.filter((item) => !item.student_id || item.student_id === team.studentId)
      : mine;
    return mineOnly[0] ?? null;
  }, [event.slug, mine]);

  useEffect(() => {
    if (known) setMine([known]);
  }, [known]);

  useEffect(() => {
    const team = readStoredTeam(event.slug);
    if (!team) {
      router.replace(`/e/${event.slug}/join`);
      return;
    }
    void getStudentBoard(event.slug, team.teamId).then((result) => {
      if (!result.ok) return;
      const fresh = result.data.tasks.find((item) => item.id === task.id);
      if (fresh) setBoardTask(fresh);
      const rows = result.data.submissions.filter((item) => item.task_id === task.id);
      setMine(
        team.studentId
          ? rows.filter((item) => !item.student_id || item.student_id === team.studentId)
          : rows,
      );
    });
  }, [event.slug, router, task.id]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => {
      setShownProgress((current) => {
        if (progress >= 100) return 100;
        if (current < progress) {
          return Math.min(progress, current + Math.max(1.2, (progress - current) * 0.22));
        }
        if (progress >= 88 && current < 98) return current + 0.45;
        return current;
      });
    }, 70);
    return () => window.clearInterval(timer);
  }, [busy, progress]);

  function pickFile(next: File | null) {
    if (!next) return;
    setFile(next);
    setError("");
    setJustSaved(false);
    setPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
    const pair = compressForUpload(next);
    const prep: NonNullable<typeof prepRef.current> = { file: next, pair };
    prepRef.current = prep;
    void pair
      .then(() => {
        if (prepRef.current !== prep) return;
        const team = readStoredTeam(event.slug);
        if (!team) return;
        prep.slot = prepareSubmissionUpload({
          slug: event.slug,
          taskId: task.id,
          teamId: team.teamId,
          studentId: team.studentId ?? "",
        });
      })
      .catch(() => undefined);
    void locate().then((coords) => {
      coordsRef.current = coords;
    });
    window.setTimeout(() => captionRef.current?.focus(), 50);
  }

  function startEdit() {
    setEditing(true);
    setJustSaved(false);
    setCelebrate(false);
    setCaption(existing?.caption ?? "");
    setPreview(existing ? sharpImage(existing) : null);
    setFile(null);
    setError("");
    prepRef.current = null;
  }

  function cancelEdit() {
    setEditing(false);
    setFile(null);
    setPreview(null);
    setCaption("");
    setError("");
    setProgress(0);
    prepRef.current = null;
  }

  async function locate() {
    if (!navigator.geolocation) return { lat: null as number | null, lng: null as number | null };
    return new Promise<{ lat: number | null; lng: number | null }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 800, maximumAge: 120000 },
      );
    });
  }

  async function sendOnce(
    pair: Awaited<ReturnType<typeof compressForUpload>> | null,
    coords: { lat: number | null; lng: number | null },
  ) {
    const team = readStoredTeam(event.slug);
    if (!team) return { ok: false as const, error: "請先加入組別並選一張照片" };
    if (!pair && !existing) return { ok: false as const, error: "請先拍一張照片" };

    let fullPath = "";
    let thumbPath = "";
    if (pair) {
      const cached = prepRef.current?.file === file ? prepRef.current.slot : undefined;
      if (prepRef.current?.file === file) prepRef.current.slot = undefined;
      const slot =
        cached
          ? await cached
          : await prepareSubmissionUpload({
              slug: event.slug,
              taskId: task.id,
              teamId: team.teamId,
              studentId: team.studentId ?? "",
            });
      if (!slot.ok) return slot;
      setProgress(82);
      let fullRatio = 0;
      let thumbRatio = 0;
      const bump = () => setProgress(82 + Math.round((fullRatio + thumbRatio) * 6));
      await Promise.all([
        putFileWithProgress(slot.data.fullSignedUrl, pair.full, "image/jpeg", (ratio) => {
          fullRatio = ratio;
          bump();
        }, { path: slot.data.fullPath, token: slot.data.fullToken }),
        putFileWithProgress(slot.data.thumbSignedUrl, pair.thumb, "image/jpeg", (ratio) => {
          thumbRatio = ratio;
          bump();
        }, { path: slot.data.thumbPath, token: slot.data.thumbToken }),
      ]);
      fullPath = slot.data.fullPath;
      thumbPath = slot.data.thumbPath;
      setProgress(94);
    }

    const form = new FormData();
    form.set("slug", event.slug);
    form.set("taskId", task.id);
    form.set("teamId", team.teamId);
    form.set("caption", caption);
    form.set("studentId", team.studentId ?? "");
    form.set("studentName", team.studentName ?? "");
    if (coords.lat != null) form.set("lat", String(coords.lat));
    if (coords.lng != null) form.set("lng", String(coords.lng));
    if (fullPath) form.set("fullPath", fullPath);
    if (thumbPath) form.set("thumbPath", thumbPath);
    return uploadSubmission(form);
  }

  async function onSubmit(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    if (busy) return;
    if (!file && !existing) return;
    if (task.requires_caption && !caption.trim()) {
      setError("寫一句話再說說你為什麼拍它");
      captionRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setProgress(18);
    setShownProgress(12);
    const firstTime = !existing;
    let pair: Awaited<ReturnType<typeof compressForUpload>> | null = null;
    try {
      if (file) {
        pair =
          prepRef.current?.file === file
            ? await prepRef.current.pair
            : await compressForUpload(file, setProgress);
        setProgress(80);
      }
    } catch {
      setError("照片處理失敗，換一張再試");
      setBusy(false);
      setProgress(0);
      return;
    }
    const coords = coordsRef.current;

    let lastError = "上傳失敗，再試一次";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await sendOnce(pair, coords);
        if (result.ok) {
          setProgress(100);
          setShownProgress(100);
          setBusy(false);
          setEditing(false);
          setFile(null);
          setPreview((current) => {
            if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
            return null;
          });
          setJustSaved(true);
          setCelebrate(firstTime);
          onUploaded?.(firstTime);
          const team = readStoredTeam(event.slug);
          if (team) {
            void getStudentBoard(event.slug, team.teamId).then((board) => {
              if (!board.ok) return;
              const rows = board.data.submissions.filter((item) => item.task_id === task.id);
              setMine(
                team.studentId
                  ? rows.filter((item) => !item.student_id || item.student_id === team.studentId)
                  : rows,
              );
            });
          }
          return;
        }
        lastError = result.error;
      } catch {
        lastError = "上傳失敗，再試一次";
      }
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
    setError(lastError);
    setBusy(false);
    setProgress(0);
  }

  const showForm = canUpload && (!existing || editing);

  return (
    <div className="space-y-4">
      {celebrate ? (
        <DoneBurst code={code} onClose={() => setCelebrate(false)} />
      ) : null}
      {closed ? (
        <Card className="px-4 py-5">
          <p className="font-black">這個任務已經截止囉</p>
        </Card>
      ) : null}

      {existing && !editing ? (
        <Card className="overflow-hidden">
          {justSaved ? (
            <div className="bg-yellow px-3.5 py-3 text-base font-black">這題完成了。每人一張。</div>
          ) : (
            <div className="px-3.5 py-2 text-[11px] font-black tracking-[0.2em] text-muted">
              你的回傳
            </div>
          )}
          {tinyImage(existing) || sharpImage(existing) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tinyImage(existing) || sharpImage(existing)} alt="" className="w-full" />
          ) : null}
          <div className="px-3.5 py-3">
            <p className="font-black">{existing.caption || "（沒有說明）"}</p>
            {canUpload ? (
              <Button className="mt-3 min-h-12 text-[15px]" variant="ghost" onClick={startEdit}>
                改照片或說明
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {showForm ? (
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? (
            <p className="text-sm font-black">改這張就好，不會再多傳一筆。</p>
          ) : null}
          {preview ? (
            <div className="border-2 border-ink bg-[#DEDCD4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="預覽" className="max-h-72 w-full object-cover" />
              <div className="grid grid-cols-2 border-t-2 border-ink">
                <label className="relative flex min-h-12 cursor-pointer items-center justify-center bg-card font-black active:bg-yellow">
                  重拍
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => {
                      pickFile(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
                <label className="relative flex min-h-12 cursor-pointer items-center justify-center border-l-2 border-ink bg-card font-black active:bg-yellow">
                  換一張
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(event) => {
                      pickFile(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center border-2 border-ink bg-card text-ink active:bg-yellow">
                <span className="text-3xl" aria-hidden>
                  📷
                </span>
                <span className="mt-2 text-lg font-black">拍照</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>
              <label className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center border-2 border-ink bg-card active:bg-yellow">
                <span className="text-3xl" aria-hidden>
                  🖼
                </span>
                <span className="mt-2 text-lg font-black">選照片</span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">
              {task.requires_caption ? "寫一句話（必填）" : "一句說明（選填）"}
            </span>
            <textarea
              ref={captionRef}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              required={task.requires_caption}
              placeholder="一句話說說你為什麼拍它"
              rows={3}
              className="w-full border-2 border-ink bg-card p-3 text-[16px] font-black"
            />
          </label>
          {busy ? (
            <div className="border-2 border-ink bg-card p-3">
              <div className="mb-2 text-sm font-black">上傳中 {Math.round(shownProgress)}%</div>
              <div className="h-3 border-2 border-ink">
                <div className="h-full bg-yellow upload-bar" style={{ width: `${shownProgress}%` }} />
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p>
          ) : null}
          <Button type="submit" disabled={busy || (!file && !existing)}>
            {busy ? "上傳中…" : error ? "上傳失敗，再試一次" : existing ? "更新回傳" : file ? "送出回傳" : "先拍一張再送出"}
          </Button>
          {editing ? (
            <Button type="button" variant="ghost" className="min-h-12 text-[15px]" onClick={cancelEdit}>
              先不改
            </Button>
          ) : null}
        </form>
      ) : !existing && !closed ? (
        <Card className="px-4 py-5">
          <p className="font-black">這題還不能交，請重新整理任務板</p>
        </Card>
      ) : null}
    </div>
  );
}
