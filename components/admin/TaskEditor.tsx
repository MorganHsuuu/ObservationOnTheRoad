"use client";

import { useState } from "react";
import { upsertTask } from "@/app/actions/admin";
import { Button } from "@/components/ui";
import type { TaskRow } from "@/lib/types";

export type TaskDraft = {
  id?: string;
  title: string;
  prompt_md: string;
  hint: string | null;
  requires_caption: boolean;
  max_photos: number;
};

export function TaskEditor({
  slug,
  initial,
  onCancel,
  onSaved,
}: {
  slug: string;
  initial: Partial<TaskRow>;
  onCancel: () => void;
  onSaved: (draft: TaskDraft) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const draft: TaskDraft = {
      id: initial.id,
      title: String(formData.get("title") ?? "").trim(),
      prompt_md: String(formData.get("prompt_md") ?? "").trim(),
      hint: String(formData.get("hint") ?? "").trim() || null,
      requires_caption: formData.get("requires_caption") === "on",
      max_photos: Math.min(3, Math.max(1, Number(formData.get("max_photos") ?? 1))),
    };
    if (!draft.title || !draft.prompt_md) {
      setError("標題和題目本文都要填");
      return;
    }
    setBusy(true);
    setError("");
    const result = await upsertTask(slug, draft);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(draft);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-black tracking-[0.2em] text-muted">標題</span>
        <input
          name="title"
          defaultValue={initial.title ?? ""}
          placeholder="例如：找到一隻兔子"
          required
          className="h-14 w-full border-2 border-ink bg-card px-3 font-black"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-black tracking-[0.2em] text-muted">題目本文</span>
        <textarea
          name="prompt_md"
          defaultValue={initial.prompt_md ?? ""}
          placeholder="學生會看到的任務說明"
          required
          rows={5}
          className="w-full border-2 border-ink bg-card p-3 font-medium"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-black tracking-[0.2em] text-muted">提示（選填）</span>
        <input
          name="hint"
          defaultValue={initial.hint ?? ""}
          placeholder="不想一次講破可以寫這裡"
          className="h-12 w-full border-2 border-ink bg-card px-3"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 font-black">
        <input
          type="checkbox"
          name="requires_caption"
          defaultChecked={initial.requires_caption ?? true}
        />
        必須寫一句說明
      </label>
      <label className="flex items-center gap-2 font-black">
        最多幾張
        <input
          type="number"
          name="max_photos"
          min={1}
          max={3}
          defaultValue={initial.max_photos ?? 1}
          className="h-12 w-20 border-2 border-ink bg-card px-2"
        />
      </label>
      {error ? <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "儲存中…" : initial.id ? "儲存修改" : "新增任務"}
      </Button>
      <Button type="button" variant="ghost" className="min-h-11 text-[15px]" onClick={onCancel}>
        取消
      </Button>
    </form>
  );
}
