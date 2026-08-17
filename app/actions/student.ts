"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeTeamCode, isTeamCode, sanitizeStudentId, sanitizeStudentName } from "@/lib/team-code";
import type {
  ActionResult,
  BroadcastKind,
  BroadcastRow,
  StoredTeam,
  SubmissionRow,
  TaskRow,
} from "@/lib/types";

export async function joinTeam(
  slug: string,
  input: { code: string; studentId: string; studentName: string },
): Promise<ActionResult<StoredTeam>> {
  const code = finalizeTeamCode(input.code);
  const studentId = sanitizeStudentId(input.studentId);
  const studentName = sanitizeStudentName(input.studentName);
  if (!isTeamCode(code)) {
    return { ok: false, error: "組別請填 01、02、03…" };
  }
  if (!studentId || !studentName) {
    return { ok: false, error: "請填學號和姓名" };
  }

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (eventError) return { ok: false, error: "連線出了問題，再試一次" };
  if (!event) return { ok: false, error: "找不到這個組別，跟老師確認一下？" };

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name, code")
    .eq("event_id", event.id)
    .eq("code", code)
    .maybeSingle();
  if (error) return { ok: false, error: "連線出了問題，再試一次" };
  if (!team) return { ok: false, error: "找不到這個組別，跟老師確認一下？" };

  await supabase.from("event_participants").upsert(
    {
      event_id: event.id,
      team_id: team.id,
      student_id: studentId,
      student_name: studentName,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "event_id,student_id" },
  );

  return {
    ok: true,
    data: {
      eventSlug: slug,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      studentId,
      studentName,
    },
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

  const [{ data: team }, { data: tasks }, { data: submissions }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).eq("event_id", event.id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*")
      .eq("event_id", event.id)
      .in("status", ["published", "closed"])
      .order("order_index", { ascending: true }),
    supabase.from("submissions").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
  ]);
  if (!team) return { ok: false as const, error: "組別已不存在，請重新加入" };

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

function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/submissions/";
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function uploadSubmission(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const slug = String(formData.get("slug") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const studentId = sanitizeStudentId(String(formData.get("studentId") ?? ""));
  const studentName = sanitizeStudentName(String(formData.get("studentName") ?? ""));
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const full = formData.get("full");
  const thumb = formData.get("thumb");
  const hasNewPhoto = full instanceof File && thumb instanceof File && full.size > 0;

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到這個活動" };

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
  if (event.status !== "live") {
    await supabase.from("events").update({ status: "live" }).eq("id", event.id);
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

  let existing: { id: string; image_urls: string[]; thumb_urls: string[] } | null = null;
  if (studentId) {
    const found = await supabase
      .from("submissions")
      .select("id, image_urls, thumb_urls")
      .eq("task_id", task.id)
      .eq("student_id", studentId)
      .maybeSingle();
    existing = found.data;
  }

  if (!hasNewPhoto && !existing) {
    return { ok: false, error: "請先拍一張照片" };
  }

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  const coords = {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };

  let imageUrls = existing?.image_urls ?? [];
  let thumbUrls = existing?.thumb_urls ?? [];
  const uploaded: string[] = [];

  if (hasNewPhoto && full instanceof File && thumb instanceof File) {
    const stamp = Date.now();
    const fullPath = `${event.slug}/${task.id}/${team.code}-${studentId || "anon"}-${stamp}.jpg`;
    const thumbPath = `${event.slug}/${task.id}/${team.code}-${studentId || "anon"}-${stamp}-thumb.webp`;

    const fullUpload = await supabase.storage
      .from("submissions")
      .upload(fullPath, full, { contentType: "image/jpeg", upsert: false });
    if (fullUpload.error) {
      return { ok: false, error: "上傳失敗，再試一次" };
    }
    uploaded.push(fullPath);

    const thumbUpload = await supabase.storage
      .from("submissions")
      .upload(thumbPath, thumb, { contentType: "image/webp", upsert: false });
    if (thumbUpload.error) {
      await supabase.storage.from("submissions").remove(uploaded);
      return { ok: false, error: "上傳失敗，再試一次" };
    }
    uploaded.push(thumbPath);

    imageUrls = [supabase.storage.from("submissions").getPublicUrl(fullPath).data.publicUrl];
    thumbUrls = [supabase.storage.from("submissions").getPublicUrl(thumbPath).data.publicUrl];
  }

  const payload = {
    task_id: task.id,
    team_id: team.id,
    image_urls: imageUrls,
    thumb_urls: thumbUrls,
    caption: caption || null,
    lat: coords.lat,
    lng: coords.lng,
    student_id: studentId || null,
    student_name: studentName || null,
  };

  if (existing) {
    const updated = await supabase.from("submissions").update(payload).eq("id", existing.id).select("id").single();
    if (updated.error || !updated.data) {
      if (uploaded.length) await supabase.storage.from("submissions").remove(uploaded);
      return { ok: false, error: "上傳失敗，再試一次" };
    }
    if (hasNewPhoto) {
      const oldPaths = [...existing.image_urls, ...existing.thumb_urls]
        .map(storagePathFromPublicUrl)
        .filter((path): path is string => Boolean(path));
      if (oldPaths.length) await supabase.storage.from("submissions").remove(oldPaths);
    }
    return { ok: true, data: { id: updated.data.id } };
  }

  let inserted: { id: string } | null = null;
  const first = await supabase.from("submissions").insert(payload).select("id").single();
  if (first.error && /student_id|student_name/.test(first.error.message)) {
    const retry = await supabase
      .from("submissions")
      .insert({
        task_id: payload.task_id,
        team_id: payload.team_id,
        image_urls: payload.image_urls,
        thumb_urls: payload.thumb_urls,
        caption: payload.caption,
        lat: payload.lat,
        lng: payload.lng,
      })
      .select("id")
      .single();
    inserted = retry.data;
    if (retry.error || !inserted) {
      if (uploaded.length) await supabase.storage.from("submissions").remove(uploaded);
      return { ok: false, error: "上傳失敗，再試一次" };
    }
  } else if (first.error || !first.data) {
    if (uploaded.length) await supabase.storage.from("submissions").remove(uploaded);
    return { ok: false, error: "上傳失敗，再試一次" };
  } else {
    inserted = first.data;
  }

  return { ok: true, data: { id: inserted.id } };
}

export async function touchPresence(
  slug: string,
  input: { teamId: string; studentId: string; studentName: string },
): Promise<ActionResult> {
  const studentId = sanitizeStudentId(input.studentId);
  const studentName = sanitizeStudentName(input.studentName);
  if (!studentId || !studentName) return { ok: false, error: "請重新加入組別" };

  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) return { ok: false, error: "找不到這個活動" };

  const { error } = await supabase.from("event_participants").upsert(
    {
      event_id: event.id,
      team_id: input.teamId,
      student_id: studentId,
      student_name: studentName,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "event_id,student_id" },
  );
  if (error) return { ok: false, error: "連線出了問題，再試一次" };
  return { ok: true, data: undefined };
}

export async function getStudentBroadcast(slug: string, studentId: string) {
  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) return { ok: false as const, error: "找不到這個活動" };

  const { data: broadcast } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "live")
    .maybeSingle();

  if (!broadcast) {
    return { ok: true as const, data: { broadcast: null, answered: false as const, answer: null } };
  }

  const { data: response } = await supabase
    .from("broadcast_responses")
    .select("*")
    .eq("broadcast_id", broadcast.id)
    .eq("student_id", sanitizeStudentId(studentId))
    .maybeSingle();

  return {
    ok: true as const,
    data: {
      broadcast: broadcast as BroadcastRow,
      answered: Boolean(response),
      answer: (response?.answer as string | undefined) ?? null,
    },
  };
}

export async function answerBroadcast(input: {
  slug: string;
  broadcastId: string;
  teamId: string;
  studentId: string;
  studentName: string;
  answer: string;
}): Promise<ActionResult> {
  const studentId = sanitizeStudentId(input.studentId);
  const studentName = sanitizeStudentName(input.studentName);
  const answer = input.answer.trim();
  if (!studentId || !studentName || !answer) {
    return { ok: false, error: "請重新加入組別後再答" };
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id").eq("slug", input.slug).maybeSingle();
  if (!event) return { ok: false, error: "找不到這個活動" };

  const { data: broadcast } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("id", input.broadcastId)
    .eq("event_id", event.id)
    .eq("status", "live")
    .maybeSingle();
  if (!broadcast) return { ok: false, error: "這則廣播已經結束" };

  const kind = broadcast.kind as BroadcastKind;
  const options = (broadcast.options ?? []) as string[];
  const valid =
    (kind === "ack" && answer === "ack") ||
    (kind === "yesno" && (answer === "yes" || answer === "no")) ||
    (kind === "choice" && options.includes(answer));
  if (!valid) return { ok: false, error: "請選一個答案" };

  await supabase.from("event_participants").upsert(
    {
      event_id: event.id,
      team_id: input.teamId,
      student_id: studentId,
      student_name: studentName,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "event_id,student_id" },
  );

  const { error } = await supabase.from("broadcast_responses").upsert(
    {
      broadcast_id: broadcast.id,
      team_id: input.teamId,
      student_id: studentId,
      student_name: studentName,
      answer,
    },
    { onConflict: "broadcast_id,student_id" },
  );
  if (error) return { ok: false, error: "送出失敗，再試一次" };
  return { ok: true, data: undefined };
}
