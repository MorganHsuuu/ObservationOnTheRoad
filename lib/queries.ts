import { connection } from "next/server";
import { mapEventRow } from "@/lib/event-pin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonServerClient } from "@/lib/supabase/anon";
import type {
  EventRow,
  ParticipantRow,
  SubmissionLikeRow,
  SubmissionWithMeta,
  TaskRow,
  TeamRow,
} from "@/lib/types";

export async function eventRequiresPin(slug: string) {
  const event = await getPublicEvent(slug);
  return Boolean(event?.requires_pin);
}

export async function getPublicEvent(slug: string) {
  await connection();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEventRow(data as EventRow, false) : null;
}

export async function getVisibleTasks(eventId: string) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("event_id", eventId)
    .in("status", ["published", "closed"])
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export async function getVisibleTask(taskId: string) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .in("status", ["published", "closed"])
    .maybeSingle();
  if (error) throw error;
  return data as TaskRow | null;
}

export async function getPublicSubmissions(eventId: string) {
  const supabase = createAdminClient();
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ["published", "closed"]);
  if (taskError) throw taskError;
  const taskIds = (tasks ?? []).map((task) => task.id);
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("submissions")
    .select(
      "*, task:tasks(id, title, order_index, prompt_md), team:teams(id, name, code)",
    )
    .in("task_id", taskIds)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubmissionWithMeta[];
}

export async function getSubmissionLikes(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("submission_likes")
    .select("submission_id, student_id")
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []) as SubmissionLikeRow[];
}

export async function getAdminEvent(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEventRow(data as EventRow, true) : null;
}

export async function getAdminEvents() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapEventRow(row as EventRow, true));
}

export async function getAdminTasks(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export async function getAdminTeams(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("event_id", eventId)
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function getAdminParticipants(eventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_participants")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ParticipantRow[];
}

export async function getAdminSubmissions(eventId: string) {
  const supabase = createAdminClient();
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("event_id", eventId);
  if (taskError) throw taskError;
  const taskIds = (tasks ?? []).map((task) => task.id);
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("submissions")
    .select(
      "*, task:tasks(id, title, order_index, prompt_md), team:teams(id, name, code)",
    )
    .in("task_id", taskIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubmissionWithMeta[];
}

export async function getLiveEvent() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "live")
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEventRow(data as EventRow, false) : null;
}

