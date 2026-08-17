"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { SONGSHAN_SEED_TASKS, SONGSHAN_SEED_TEAMS } from "@/lib/seed-tasks";
import { createAdminClient } from "@/lib/supabase/admin";
import { arrangeAfterDraft, arrangeAfterPublish } from "@/lib/task-utils";
import { finalizeEventPin, finalizeTeamCode, isEventPin, isTeamCode, teamNameFromCode } from "@/lib/team-code";
import { setAdminEventPinCookie } from "@/lib/event-pin-server";
import {
  getAdminEvent,
  getAdminSubmissions,
  getAdminTasks,
  getAdminTeams,
} from "@/lib/queries";
import type {
  ActionResult,
  BroadcastKind,
  BroadcastResponseRow,
  BroadcastRow,
  EventStatus,
  ParticipantRow,
  TaskStatus,
} from "@/lib/types";

function refreshEvent(slug: string) {
  revalidatePath(`/admin/e/${slug}`, "layout");
  revalidatePath(`/e/${slug}`, "layout");
  revalidatePath(`/e/${slug}`);
  revalidatePath(`/e/${slug}/gallery`);
  revalidatePath(`/e/${slug}/task/[taskId]`);
  revalidatePath(`/show/${slug}`);
  revalidatePath("/admin/events");
}

function parseEntryPin(formData: FormData): ActionResult<string | null> {
  const pin = finalizeEventPin(String(formData.get("entry_pin") ?? ""));
  if (!pin) return { ok: true, data: null };
  if (!isEventPin(pin)) return { ok: false, error: "登入密碼請填四碼數字，或不填" };
  return { ok: true, data: pin };
}

async function reindexTasks(eventId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  await Promise.all(
    (data ?? []).map((row, index) =>
      supabase.from("tasks").update({ order_index: index + 1 }).eq("id", row.id),
    ),
  );
}

export async function createEvent(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  if (!/^[a-z0-9-]+$/.test(slug) || !title) {
    return { ok: false, error: "請填活動名稱，slug 只能用小寫英文、數字與連字號" };
  }
  const pin = parseEntryPin(formData);
  if (!pin.ok) return pin;

  const supabase = createAdminClient();
  const { error } = await supabase.from("events").insert({
    slug,
    title,
    location_name: String(formData.get("location_name") ?? "").trim() || null,
    event_date: String(formData.get("event_date") ?? "") || null,
    story_md: String(formData.get("story_md") ?? "") || null,
    briefing_md: String(formData.get("briefing_md") ?? "") || null,
    entry_pin: pin.data,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "這個 slug 已經有人用了" };
    return { ok: false, error: error.message };
  }
  refreshEvent(slug);
  return { ok: true, data: { slug } };
}

export async function updateEvent(slug: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const pin = parseEntryPin(formData);
  if (!pin.ok) return pin;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      location_name: String(formData.get("location_name") ?? "").trim() || null,
      event_date: String(formData.get("event_date") ?? "") || null,
      story_md: String(formData.get("story_md") ?? "") || null,
      briefing_md: String(formData.get("briefing_md") ?? "") || null,
      entry_pin: pin.data,
    })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function updateEventPin(slug: string, raw: string): Promise<ActionResult> {
  await requireAdmin();
  const pin = finalizeEventPin(raw);
  if (pin && !isEventPin(pin)) return { ok: false, error: "登入密碼請填四碼數字，或不填" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({ entry_pin: pin || null })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function verifyAdminEventPin(slug: string, raw: string): Promise<ActionResult> {
  await requireAdmin();
  const entered = finalizeEventPin(raw);
  const event = await getAdminEvent(slug);
  if (!event) return { ok: false, error: "找不到場次" };
  if (event.entry_pin && entered !== event.entry_pin) {
    return { ok: false, error: "密碼不對" };
  }
  await setAdminEventPinCookie(slug);
  return { ok: true, data: undefined };
}

export async function setEventStatus(
  slug: string,
  status: EventStatus,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("events").update({ status }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function setEventFlag(
  slug: string,
  flag: "show_public",
  value: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("events").update({ [flag]: value }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function seedSongshanEvent(): Promise<ActionResult<{ slug: string }>> {
  await requireAdmin();
  const supabase = createAdminClient();
  const slug = "songshan-2026";
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { ok: false, error: "松山機場場次已經建立過了" };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      slug,
      title: "松山機場路上觀察",
      location_name: "台北松山機場",
      lat: 25.0636,
      lng: 121.5519,
      event_date: "2026-10-03",
      story_md:
        "今天我們不是來搭飛機的。\n\n把機場當成一座陌生的城市：找兔子、找沒人看的角落、幫一個地方取新名字。答案不在標示牌上。",
      briefing_md:
        "集合：一樓報到大廳大鐘下。\n請待在公共區域，不要進入管制區。\n每題拍一張、寫一句話。上傳失敗就按再試一次。",
      status: "setup",
      gallery_public: true,
      entry_pin: "1003",
    })
    .select("id")
    .single();
  if (error || !event) return { ok: false, error: error?.message ?? "建立失敗" };

  const { error: taskError } = await supabase.from("tasks").insert(
    SONGSHAN_SEED_TASKS.map((task) => ({
      event_id: event.id,
      ...task,
      requires_photo: true,
      requires_caption: true,
      max_photos: 1,
      status: "draft",
    })),
  );
  if (taskError) return { ok: false, error: taskError.message };

  const { error: teamError } = await supabase.from("teams").insert(
    SONGSHAN_SEED_TEAMS.map((team) => ({
      event_id: event.id,
      ...team,
    })),
  );
  if (teamError) return { ok: false, error: teamError.message };

  refreshEvent(slug);
  return { ok: true, data: { slug } };
}

export async function upsertTask(
  slug: string,
  input: {
    id?: string;
    title: string;
    prompt_md: string;
    hint: string | null;
    requires_caption: boolean;
    max_photos: number;
  },
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到場次" };

  if (input.id) {
    const { error } = await supabase
      .from("tasks")
      .update({
        title: input.title,
        prompt_md: input.prompt_md,
        hint: input.hint,
        requires_caption: input.requires_caption,
        max_photos: input.max_photos,
      })
      .eq("id", input.id)
      .eq("event_id", event.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: last } = await supabase
      .from("tasks")
      .select("order_index")
      .eq("event_id", event.id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("tasks").insert({
      event_id: event.id,
      order_index: (last?.order_index ?? 0) + 1,
      title: input.title,
      prompt_md: input.prompt_md,
      hint: input.hint,
      requires_photo: true,
      requires_caption: input.requires_caption,
      max_photos: input.max_photos,
      status: "draft",
    });
    if (error) return { ok: false, error: error.message };
  }
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function deleteTask(slug: string, taskId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: row } = await supabase.from("tasks").select("event_id").eq("id", taskId).maybeSingle();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  if (row?.event_id) await reindexTasks(row.event_id);
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function duplicateTask(slug: string, taskId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) return { ok: false, error: "找不到任務" };
  const { data: last } = await supabase
    .from("tasks")
    .select("order_index")
    .eq("event_id", task.event_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();
  const { error } = await supabase.from("tasks").insert({
    event_id: task.event_id,
    order_index: (last?.order_index ?? 0) + 1,
    title: `${task.title}（複製）`,
    prompt_md: task.prompt_md,
    hint: task.hint,
    requires_photo: task.requires_photo,
    requires_caption: task.requires_caption,
    max_photos: task.max_photos,
    status: "draft",
  });
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function importTasksFromEvent(
  targetSlug: string,
  sourceSlug: string,
): Promise<ActionResult<{ count: number }>> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("events")
    .select("id")
    .eq("slug", targetSlug)
    .maybeSingle();
  const { data: source } = await supabase
    .from("events")
    .select("id")
    .eq("slug", sourceSlug)
    .maybeSingle();
  if (!target || !source) return { ok: false, error: "找不到場次" };

  const { data: sourceTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("event_id", source.id)
    .order("order_index");
  if (!sourceTasks?.length) return { ok: false, error: "來源場次沒有題目" };

  const { data: last } = await supabase
    .from("tasks")
    .select("order_index")
    .eq("event_id", target.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("tasks").insert(
    sourceTasks.map((task, index) => ({
      event_id: target.id,
      order_index: (last?.order_index ?? 0) + index + 1,
      title: task.title,
      prompt_md: task.prompt_md,
      hint: task.hint,
      requires_photo: task.requires_photo,
      requires_caption: task.requires_caption,
      max_photos: task.max_photos,
      status: "draft",
    })),
  );
  if (error) return { ok: false, error: error.message };
  refreshEvent(targetSlug);
  return { ok: true, data: { count: sourceTasks.length } };
}

export async function moveTask(
  slug: string,
  taskId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到場次" };
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("event_id", event.id)
    .order("order_index");
  const ids = (tasks ?? []).map((task) => task.id);
  const index = ids.indexOf(taskId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= ids.length) {
    return { ok: true, data: undefined };
  }
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(swapWith, 0, moved);
  return reorderTasks(slug, next);
}

export async function reorderTasks(slug: string, orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到場次" };
  const { data: tasks } = await supabase.from("tasks").select("id").eq("event_id", event.id);
  const allowed = new Set((tasks ?? []).map((task) => task.id));
  if (
    orderedIds.length !== allowed.size ||
    orderedIds.some((id) => !allowed.has(id)) ||
    new Set(orderedIds).size !== orderedIds.length
  ) {
    return { ok: false, error: "題庫已更新，請重整後再排" };
  }
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("tasks").update({ order_index: index + 1 }).eq("id", id),
    ),
  );
  const failed = results.find((item) => item.error)?.error;
  if (failed) return { ok: false, error: failed.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function setTaskStatus(
  slug: string,
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, event_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: "找不到任務" };
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  const { data: rows } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("event_id", task.event_id)
    .order("order_index");
  const arranged =
    status === "published"
      ? arrangeAfterPublish(rows ?? [], taskId)
      : status === "draft"
        ? arrangeAfterDraft(rows ?? [], taskId)
        : (rows ?? []);
  await Promise.all(
    arranged.map((row, index) =>
      supabase.from("tasks").update({ order_index: index + 1 }).eq("id", row.id),
    ),
  );

  if (status === "published") {
    await supabase.from("events").update({ status: "live" }).eq("slug", slug);
  }
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function closeAllTasks(slug: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到場次" };
  const { error } = await supabase
    .from("tasks")
    .update({ status: "closed" })
    .eq("event_id", event.id)
    .eq("status", "published");
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function upsertTeam(
  slug: string,
  input: { id?: string; code: string; members: string | null },
): Promise<ActionResult> {
  await requireAdmin();
  const code = finalizeTeamCode(input.code);
  if (!isTeamCode(code)) {
    return { ok: false, error: "組別請填 01、02、03…" };
  }
  const name = teamNameFromCode(code);
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return { ok: false, error: "找不到場次" };

  if (input.id) {
    const { error } = await supabase
      .from("teams")
      .update({ name, code, members: input.members })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("teams").insert({
      event_id: event.id,
      name,
      code,
      members: input.members,
    });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "這個代碼已經有組在用" };
      return { ok: false, error: error.message };
    }
  }
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function deleteTeam(slug: string, teamId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function setSubmissionFlags(
  slug: string,
  submissionId: string,
  flags: { is_featured?: boolean; is_hidden?: boolean },
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("submissions").update(flags).eq("id", submissionId);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}

export async function getAdminRoom(slug: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) return { ok: false as const, error: "找不到場次" };

  const [{ data: participants }, { data: broadcast }] = await Promise.all([
    supabase
      .from("event_participants")
      .select("*")
      .eq("event_id", event.id)
      .order("last_seen_at", { ascending: false }),
    supabase
      .from("broadcasts")
      .select("*")
      .eq("event_id", event.id)
      .eq("status", "live")
      .maybeSingle(),
  ]);

  let responses: BroadcastResponseRow[] = [];
  if (broadcast) {
    const { data } = await supabase
      .from("broadcast_responses")
      .select("*")
      .eq("broadcast_id", broadcast.id)
      .order("created_at", { ascending: true });
    responses = (data ?? []) as BroadcastResponseRow[];
  }

  return {
    ok: true as const,
    data: {
      participants: (participants ?? []) as ParticipantRow[],
      broadcast: (broadcast as BroadcastRow | null) ?? null,
      responses,
    },
  };
}

export async function getAdminLive(slug: string) {
  await requireAdmin();
  const event = await getAdminEvent(slug);
  if (!event) return { ok: false as const, error: "找不到場次" };
  const [tasks, teams, submissions] = await Promise.all([
    getAdminTasks(event.id),
    getAdminTeams(event.id),
    getAdminSubmissions(event.id),
  ]);
  return { ok: true as const, data: { event, tasks, teams, submissions } };
}

export async function publishBroadcast(
  slug: string,
  input: { kind: BroadcastKind; body: string; options?: string[] },
): Promise<ActionResult<BroadcastRow>> {
  await requireAdmin();
  const body = input.body.trim();
  if (!body) return { ok: false, error: "請寫廣播內容" };

  const options = (input.options ?? []).map((item) => item.trim()).filter(Boolean);
  if (input.kind === "choice") {
    if (options.length < 2) return { ok: false, error: "選擇題至少兩個選項" };
    if (options.length > 4) return { ok: false, error: "選擇題最多四個選項" };
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) return { ok: false, error: "找不到場次" };

  await supabase.from("broadcasts").update({ status: "closed" }).eq("event_id", event.id).eq("status", "live");

  const { data, error } = await supabase
    .from("broadcasts")
    .insert({
      event_id: event.id,
      kind: input.kind,
      body,
      options: input.kind === "choice" ? options : [],
      status: "live",
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "發布失敗" };
  refreshEvent(slug);
  return { ok: true, data: data as BroadcastRow };
}

export async function closeBroadcast(slug: string, broadcastId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("broadcasts")
    .update({ status: "closed" })
    .eq("id", broadcastId);
  if (error) return { ok: false, error: error.message };
  refreshEvent(slug);
  return { ok: true, data: undefined };
}
