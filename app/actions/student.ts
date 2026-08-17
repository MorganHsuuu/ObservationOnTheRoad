"use server";

import { mapEventRow } from "@/lib/event-pin";
import { hasEventPinCookie, setEventPinCookie } from "@/lib/event-pin-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeEventPin, finalizeTeamCode, isTeamCode, sanitizeStudentId, sanitizeStudentName } from "@/lib/team-code";
import type {
  ActionResult,
  BroadcastKind,
  BroadcastRow,
  EventRow,
  StoredTeam,
  SubmissionRow,
  TaskRow,
} from "@/lib/types";

export async function joinTeam(
  slug: string,
  input: { code: string; studentId: string; studentName: string; pin?: string },
): Promise<ActionResult<StoredTeam>> {
  const code = finalizeTeamCode(input.code);
  const studentId = sanitizeStudentId(input.studentId);
  const studentName = sanitizeStudentName(input.studentName);
  const pin = finalizeEventPin(input.pin ?? "");
  if (!isTeamCode(code)) {
    return { ok: false, error: "組別請填 01、02、03…" };
  }
  if (!studentId || !studentName) {
    return { ok: false, error: "請填學號和姓名" };
  }

  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug, entry_pin")
    .eq("slug", slug)
    .maybeSingle();
  if (eventError) return { ok: false, error: "連線出了問題，再試一次" };
  if (!event) return { ok: false, error: "找不到這個組別，跟老師確認一下？" };
  if (event.entry_pin && pin !== event.entry_pin) {
    return { ok: false, error: "登入密碼不對" };
  }
  if (event.entry_pin) await setEventPinCookie(slug);

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

export async function verifyEventPin(slug: string, pin: string): Promise<ActionResult> {
  const entered = finalizeEventPin(pin);
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("entry_pin")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return { ok: false, error: "連線出了問題，再試一次" };
  if (!event) return { ok: false, error: "找不到這個活動" };
  if (event.entry_pin && entered !== event.entry_pin) {
    return { ok: false, error: "密碼不對，再問老師一次" };
  }
  await setEventPinCookie(slug);
  return { ok: true, data: undefined };
}

export async function getStudentBoard(slug: string, teamId: string) {
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false as const, error: "找不到這個活動" };
  if (event.entry_pin && !(await hasEventPinCookie(slug))) {
    return { ok: false as const, error: "請先輸入場次密碼", needsPin: true as const };
  }

  const [{ data: team }, { data: tasks }, { data: submissions }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).eq("event_id", event.id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*")
      .eq("event_id", event.id)
      .order("order_index", { ascending: true }),
    supabase.from("submissions").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
  ]);
  if (!team) return { ok: false as const, error: "組別已不存在，請重新加入" };

  return {
    ok: true as const,
    data: {
      event: mapEventRow(event as EventRow, false),
      team,
      tasks: ((tasks ?? []) as TaskRow[]).map((task) =>
        task.status === "draft"
          ? { ...task, title: "", prompt_md: "", hint: null }
          : task,
      ),
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

function ownedStoragePath(path: string, slug: string) {
  return Boolean(path) && path.startsWith(`${slug}/`) && !path.includes("..") && !path.startsWith("/");
}

async function resolveLiveUpload(input: { slug: string; taskId: string; teamId: string }) {
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", input.slug)
    .maybeSingle();
  if (!event) return { ok: false as const, error: "找不到這個活動" };
  if (event.entry_pin && !(await hasEventPinCookie(input.slug))) {
    return { ok: false as const, error: "請先輸入場次密碼" };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!task) return { ok: false as const, error: "找不到這個任務" };
  if (task.status !== "published") {
    return { ok: false as const, error: "這個任務已經截止囉" };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", input.teamId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!team) return { ok: false as const, error: "組別已不存在，請重新加入" };

  return { ok: true as const, data: { supabase, event, task, team } };
}

export async function prepareSubmissionUpload(input: {
  slug: string;
  taskId: string;
  teamId: string;
  studentId: string;
}): Promise<
  ActionResult<{
    fullPath: string;
    thumbPath: string;
    fullToken: string;
    thumbToken: string;
    fullSignedUrl: string;
    thumbSignedUrl: string;
  }>
> {
  const studentId = sanitizeStudentId(input.studentId);
  const live = await resolveLiveUpload(input);
  if (!live.ok) return live;
  const { supabase, event, task, team } = live.data;
  const stamp = Date.now();
  const prefix = `${event.slug}/${task.id}/${team.code}-${studentId || "anon"}-${stamp}`;
  const fullPath = `${prefix}.jpg`;
  const thumbPath = `${prefix}-thumb.jpg`;

  const [fullSlot, thumbSlot] = await Promise.all([
    supabase.storage.from("submissions").createSignedUploadUrl(fullPath),
    supabase.storage.from("submissions").createSignedUploadUrl(thumbPath),
  ]);
  if (
    fullSlot.error ||
    !fullSlot.data?.signedUrl ||
    !fullSlot.data.token ||
    thumbSlot.error ||
    !thumbSlot.data?.signedUrl ||
    !thumbSlot.data.token
  ) {
    return { ok: false, error: "上傳失敗，再試一次" };
  }

  return {
    ok: true,
    data: {
      fullPath,
      thumbPath,
      fullToken: fullSlot.data.token,
      thumbToken: thumbSlot.data.token,
      fullSignedUrl: fullSlot.data.signedUrl,
      thumbSignedUrl: thumbSlot.data.signedUrl,
    },
  };
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
  const fullPath = String(formData.get("fullPath") ?? "");
  const thumbPath = String(formData.get("thumbPath") ?? "");
  const hasNewPhoto = ownedStoragePath(fullPath, slug) && ownedStoragePath(thumbPath, slug);

  const live = await resolveLiveUpload({ slug, taskId, teamId });
  if (!live.ok) return live;
  const { supabase, event, task, team } = live.data;

  if (event.status !== "live") {
    await supabase.from("events").update({ status: "live" }).eq("id", event.id);
  }
  if (task.requires_caption && caption.length === 0) {
    return { ok: false, error: "寫一句話再說說你為什麼拍它" };
  }

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

  if (hasNewPhoto) {
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
      if (hasNewPhoto) await supabase.storage.from("submissions").remove([fullPath, thumbPath]);
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
      if (hasNewPhoto) await supabase.storage.from("submissions").remove([fullPath, thumbPath]);
      return { ok: false, error: "上傳失敗，再試一次" };
    }
  } else if (first.error || !first.data) {
    if (hasNewPhoto) await supabase.storage.from("submissions").remove([fullPath, thumbPath]);
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

export async function toggleSubmissionLike(
  slug: string,
  submissionId: string,
  studentId: string,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const liker = sanitizeStudentId(studentId);
  if (!liker) return { ok: false, error: "請重新整理後再按一次" };

  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) return { ok: false, error: "找不到這個活動" };

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, is_hidden, task_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission || submission.is_hidden) return { ok: false, error: "這張已經不在牆上" };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, event_id")
    .eq("id", submission.task_id)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!task) return { ok: false, error: "這張已經不在牆上" };

  const { data: existing } = await supabase
    .from("submission_likes")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("student_id", liker)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("submission_likes").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "按愛心失敗，再試一次" };
  } else {
    const { error } = await supabase.from("submission_likes").insert({
      event_id: event.id,
      submission_id: submissionId,
      student_id: liker,
    });
    if (error) return { ok: false, error: "按愛心失敗，再試一次" };
  }

  const { count, error: countError } = await supabase
    .from("submission_likes")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if (countError) return { ok: false, error: "按愛心失敗，再試一次" };

  return { ok: true, data: { liked: !existing, count: count ?? 0 } };
}
