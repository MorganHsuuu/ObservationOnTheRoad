"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, StoredTeam, SubmissionRow, TaskRow } from "@/lib/types";

export async function joinTeam(
  slug: string,
  code: string,
): Promise<ActionResult<StoredTeam>> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(normalized)) {
    return { ok: false, error: "找不到這個代碼，跟老師確認一下？" };
  }

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (eventError) return { ok: false, error: "連線出了問題，再試一次" };
  if (!event) return { ok: false, error: "找不到這個代碼，跟老師確認一下？" };

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name, code")
    .eq("event_id", event.id)
    .eq("code", normalized)
    .maybeSingle();
  if (error) return { ok: false, error: "連線出了問題，再試一次" };
  if (!team) return { ok: false, error: "找不到這個代碼，跟老師確認一下？" };

  return {
    ok: true,
    data: { eventSlug: slug, teamId: team.id, teamName: team.name },
  };
}

export async function getStudentBoard(slug: string, teamId: string) {
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false as const, error: "找不到這個活動" };

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!team) return { ok: false as const, error: "組別已不存在，請重新加入" };

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("event_id", event.id)
    .in("status", ["published", "closed"])
    .order("order_index", { ascending: true });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  return {
    ok: true as const,
    data: {
      event,
      team,
      tasks: (tasks ?? []) as TaskRow[],
      submissions: (submissions ?? []) as SubmissionRow[],
    },
  };
}

export async function uploadSubmission(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const slug = String(formData.get("slug") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const full = formData.get("full");
  const thumb = formData.get("thumb");

  if (!(full instanceof File) || !(thumb instanceof File) || full.size === 0) {
    return { ok: false, error: "請先拍一張照片" };
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到這個活動" };
  if (event.status === "archived") {
    return { ok: false, error: "活動已結束，不能再上傳" };
  }
  if (event.status !== "live") {
    await supabase.from("events").update({ status: "live" }).eq("id", event.id);
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!task) return { ok: false, error: "找不到這個任務" };
  if (task.status !== "published") {
    return { ok: false, error: "這個任務已經截止囉" };
  }
  if (task.requires_caption && caption.length === 0) {
    return { ok: false, error: "寫一句話再說說你為什麼拍它" };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!team) return { ok: false, error: "組別已不存在，請重新加入" };

  const stamp = Date.now();
  const fullPath = `${event.slug}/${task.id}/${team.code}-${stamp}.jpg`;
  const thumbPath = `${event.slug}/${task.id}/${team.code}-${stamp}-thumb.webp`;

  const fullUpload = await supabase.storage
    .from("submissions")
    .upload(fullPath, full, { contentType: "image/jpeg", upsert: false });
  if (fullUpload.error) {
    return { ok: false, error: "上傳失敗，再試一次" };
  }

  const thumbUpload = await supabase.storage
    .from("submissions")
    .upload(thumbPath, thumb, { contentType: "image/webp", upsert: false });
  if (thumbUpload.error) {
    await supabase.storage.from("submissions").remove([fullPath]);
    return { ok: false, error: "上傳失敗，再試一次" };
  }

  const fullUrl = supabase.storage.from("submissions").getPublicUrl(fullPath)
    .data.publicUrl;
  const thumbUrl = supabase.storage.from("submissions").getPublicUrl(thumbPath)
    .data.publicUrl;

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

  const { data: inserted, error } = await supabase
    .from("submissions")
    .insert({
      task_id: task.id,
      team_id: team.id,
      image_urls: [fullUrl],
      thumb_urls: [thumbUrl],
      caption: caption || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    await supabase.storage.from("submissions").remove([fullPath, thumbPath]);
    return { ok: false, error: "上傳失敗，再試一次" };
  }

  return { ok: true, data: { id: inserted.id } };
}
