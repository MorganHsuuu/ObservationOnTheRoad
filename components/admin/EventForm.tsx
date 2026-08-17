"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent, updateEvent } from "@/app/actions/admin";
import { Button } from "@/components/ui";
import { useNavPending } from "@/components/NavigationProvider";
import type { EventRow } from "@/lib/types";

export function EventForm({ event }: { event?: EventRow }) {
  const router = useRouter();
  const { start, stop } = useNavPending();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError("");
    start("儲存中");
    if (event) {
      const result = await updateEvent(event.slug, formData);
      if (!result.ok) {
        setBusy(false);
        stop();
        setError(result.error);
        return;
      }
      router.push(`/admin/e/${event.slug}`);
      return;
    }
    const result = await createEvent(formData);
    if (!result.ok) {
      setBusy(false);
      stop();
      setError(result.error);
      return;
    }
    router.push(`/admin/e/${result.data.slug}`);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Field label="活動名稱" name="title" defaultValue={event?.title} required />
      <Field
        label="slug"
        name="slug"
        defaultValue={event?.slug}
        required
        disabled={Boolean(event)}
        placeholder="songshan-2026"
      />
      <Field label="地點" name="location_name" defaultValue={event?.location_name ?? ""} />
      <Field label="日期" name="event_date" type="date" defaultValue={event?.event_date ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="緯度" name="lat" defaultValue={event?.lat?.toString() ?? ""} />
        <Field label="經度" name="lng" defaultValue={event?.lng?.toString() ?? ""} />
      </div>
      <Area label="故事設定" name="story_md" defaultValue={event?.story_md ?? ""} />
      <Area label="行前說明" name="briefing_md" defaultValue={event?.briefing_md ?? ""} />
      {error ? <p className="bg-danger px-3 py-3 text-sm font-black text-white">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "儲存中…" : event ? "儲存場次" : "建立場次"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  disabled,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="h-14 w-full border-2 border-ink bg-card px-3 font-black disabled:bg-[#DEDCD4]"
      />
    </label>
  );
}

function Area({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black tracking-[0.2em] text-muted">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={5}
        className="w-full border-2 border-ink bg-card p-3 font-medium"
      />
    </label>
  );
}
