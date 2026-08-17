"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStudentBoard, uploadSubmission } from "@/app/actions/student";
import { Button, Card } from "@/components/ui";
import { compressForUpload } from "@/lib/compress";
import { readStoredTeam } from "@/lib/team-storage";
import { uploadAllowed } from "@/lib/task-utils";
import { sharpImage } from "@/lib/media";
import type { EventRow, SubmissionRow, TaskRow } from "@/lib/types";

export function UploadForm({
  event,
  task,
  compact = false,
  onUploaded,
}: {
  event: EventRow;
  task: TaskRow;
  compact?: boolean;
  onUploaded?: () => void;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<SubmissionRow[]>([]);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [boardEvent, setBoardEvent] = useState<EventRow | null>(null);
  const [boardTask, setBoardTask] = useState<TaskRow | null>(null);

  const liveEvent = boardEvent ?? event;
  const liveTask = boardTask?.id === task.id ? boardTask : task;
  const closed = liveTask.status === "closed";
  const canUpload = uploadAllowed(liveTask);

  useEffect(() => {
    const team = readStoredTeam(event.slug);
    if (!team) {
      router.replace(`/e/${event.slug}/join`);
      return;
    }
    void getStudentBoard(event.slug, team.teamId).then((result) => {
      if (!result.ok) return;
      setBoardEvent(result.data.event);
      const fresh = result.data.tasks.find((item) => item.id === task.id);
      if (fresh) setBoardTask(fresh);
      setMine(result.data.submissions.filter((item) => item.task_id === task.id));
    });
  }, [event.slug, router, task.id]);

  function pickFile(next: File | null) {
    if (!next) return;
    setFile(next);
    setError("");
    setDone(false);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      window.setTimeout(() => captionRef.current?.focus(), 50);
    };
    reader.readAsDataURL(next);
  }

  function resetPick() {
    setFile(null);
    setPreview(null);
    setDone(false);
    setError("");
    setProgress(0);
  }

  async function locate() {
    if (!navigator.geolocation) return { lat: null as number | null, lng: null as number | null };
    return new Promise<{ lat: number | null; lng: number | null }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 2500, maximumAge: 60000 },
      );
    });
  }

  async function submitOnce() {
    const team = readStoredTeam(event.slug);
    if (!team || !file) return { ok: false as const, error: "請先加入組別並選一張照片" };
    setProgress(8);
    const pair = await compressForUpload(file, setProgress);
    const coords = await locate();
    const form = new FormData();
    form.set("slug", event.slug);
    form.set("taskId", task.id);
    form.set("teamId", team.teamId);
    form.set("caption", caption);
    form.set("studentId", team.studentId ?? "");
    form.set("studentName", team.studentName ?? "");
    if (coords.lat != null) form.set("lat", String(coords.lat));
    if (coords.lng != null) form.set("lng", String(coords.lng));
    form.set("full", pair.full);
    form.set("thumb", pair.thumb);
    setProgress(92);
    return uploadSubmission(form);
  }

  async function onSubmit(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    if (!file || busy) return;
    if (task.requires_caption && !caption.trim()) {
      setError("寫一句話再說說你為什麼拍它");
      captionRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    let lastError = "上傳失敗，再試一次";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await submitOnce();
        if (result.ok) {
          setDone(true);
          setProgress(100);
          setBusy(false);
          onUploaded?.();
          const team = readStoredTeam(event.slug);
          if (team) {
            void getStudentBoard(event.slug, team.teamId).then((board) => {
              if (!board.ok) return;
              setMine(board.data.submissions.filter((item) => item.task_id === task.id));
            });
          }
          return;
        }
        lastError = result.error;
      } catch {
        lastError = "上傳失敗，再試一次";
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    setError(lastError);
    setBusy(false);
    setProgress(0);
  }

  if (done) {
    return (
      <Card className="px-4 py-8 text-center">
        <p className="text-2xl font-black">回傳成功 🎉 繼續觀察吧</p>
        <button
          type="button"
          className="mt-5 flex min-h-14 w-full items-center justify-center border-2 border-ink bg-card text-lg font-black"
          onClick={resetPick}
        >
          再傳一張
        </button>
        {!compact && liveEvent.gallery_public ? (
          <Link
            href={`/e/${event.slug}/gallery`}
            className="mt-2 flex min-h-14 items-center justify-center border-2 border-ink bg-ink text-lg font-black text-paper"
          >
            看看大家拍了什麼
          </Link>
        ) : !compact ? (
          <Link
            href={`/e/${event.slug}`}
            className="mt-2 flex min-h-14 items-center justify-center border-2 border-ink bg-card text-lg font-black"
          >
            回到任務板
          </Link>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {closed ? (
        <Card className="px-4 py-5">
          <p className="font-black">這個任務已經截止囉</p>
        </Card>
      ) : canUpload ? (
        <form onSubmit={onSubmit} className="space-y-4">
          {preview ? (
            <div className="border-2 border-ink bg-[#DEDCD4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="預覽" className="max-h-72 w-full object-cover" />
              <div className="grid grid-cols-2 border-t-2 border-ink">
                <label className="relative flex min-h-12 cursor-pointer items-center justify-center font-black">
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
                <label className="relative flex min-h-12 cursor-pointer items-center justify-center border-l-2 border-ink font-black">
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
              <label className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center border-2 border-ink bg-yellow text-ink">
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
              <label className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center border-2 border-ink bg-card">
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
              <div className="mb-2 text-sm font-black">上傳中 {progress}%</div>
              <div className="h-3 border-2 border-ink">
                <div className="h-full bg-yellow" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p>
          ) : null}
          <Button type="submit" disabled={busy || !file}>
            {busy ? "上傳中…" : error ? "上傳失敗，再試一次" : file ? "送出回傳" : "先拍一張再送出"}
          </Button>
        </form>
      ) : (
        <Card className="px-4 py-5">
          <p className="font-black">
            {closed ? "這個任務已經截止囉" : "這題還不能交，請重新整理任務板"}
          </p>
        </Card>
      )}

      {mine.length > 0 ? (
        <section id="mine" className="space-y-2">
          <h2 className="text-xs font-black tracking-[0.2em] text-muted">
            我的回傳（{mine.length}）
          </h2>
          {mine.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {sharpImage(item) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sharpImage(item)} alt="" className="w-full" />
              ) : null}
              <div className="px-3.5 py-3">
                <p className="font-black">{item.caption || "（沒有說明）"}</p>
              </div>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
