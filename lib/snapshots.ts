import { studentTaskRate } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { boardTaskCode, sortTasksByOrder, taskStatusLabel } from "@/lib/task-utils";
import { teamLabel } from "@/lib/team-code";
import type {
  ParticipantRow,
  RosterSnapshotPerson,
  SnapshotKind,
  SnapshotListItem,
  SnapshotSource,
  TaskRow,
  TaskSnapshotItem,
  TeamRow,
} from "@/lib/types";

const TAIPEI = "Asia/Taipei";

function taipeiDay(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function samePayload(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function buildRosterSnapshot(eventId: string): Promise<RosterSnapshotPerson[]> {
  const supabase = createAdminClient();
  const [{ data: teams }, { data: people }, { data: tasks }, { data: taskIds }] = await Promise.all([
    supabase.from("teams").select("*").eq("event_id", eventId),
    supabase.from("event_participants").select("*").eq("event_id", eventId),
    supabase.from("tasks").select("*").eq("event_id", eventId).order("order_index", { ascending: true }),
    supabase.from("tasks").select("id").eq("event_id", eventId),
  ]);
  const taskList = (tasks ?? []) as TaskRow[];
  const released = taskList.filter((task) => task.status === "published" || task.status === "closed");
  const releasedIds = released.map((task) => task.id);
  const ids = (taskIds ?? []).map((task) => task.id);
  const { data: submissions } = ids.length
    ? await supabase.from("submissions").select("task_id, student_id, team_id").in("task_id", ids)
    : { data: [] };
  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((team) => [team.id, team]));
  return ((people ?? []) as ParticipantRow[])
    .map((person) => {
      const rate = studentTaskRate(person.student_id, releasedIds, submissions ?? []);
      return {
        team: teamLabel(teamMap.get(person.team_id)),
        name: person.student_name,
        studentId: person.student_id,
        done: rate.done,
        total: rate.total,
        pct: rate.pct,
      };
    })
    .sort((a, b) => a.team.localeCompare(b.team, "zh-Hant") || a.name.localeCompare(b.name, "zh-Hant"));
}

export async function buildTaskSnapshot(eventId: string): Promise<TaskSnapshotItem[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  const tasks = sortTasksByOrder((data ?? []) as TaskRow[]);
  return tasks.map((task) => ({
    code: boardTaskCode(task.id, tasks),
    title: task.title,
    prompt: task.prompt_md,
    status: taskStatusLabel(task.status),
    maxPhotos: task.max_photos,
  }));
}

async function currentPayload(eventId: string, kind: SnapshotKind) {
  if (kind === "roster") return buildRosterSnapshot(eventId);
  return buildTaskSnapshot(eventId);
}

async function latestSnapshot(eventId: string, kind: SnapshotKind) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_snapshots")
    .select("id, source, payload, created_at")
    .eq("event_id", eventId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; source: SnapshotSource; payload: unknown; created_at: string } | null;
}

export async function keepDailySnapshot(eventId: string, kind: SnapshotKind) {
  try {
    const payload = await currentPayload(eventId, kind);
    const latest = await latestSnapshot(eventId, kind);
    if (latest && samePayload(latest.payload, payload)) return;
    if (latest?.source === "daily" && taipeiDay(latest.created_at) === taipeiDay(new Date())) return;
    const supabase = createAdminClient();
    await supabase.from("event_snapshots").insert({
      event_id: eventId,
      kind,
      source: "daily",
      payload,
    });
  } catch {
    // 紀錄表還沒建好時，組別和題庫頁仍要能開。
  }
}

export async function keepDailySnapshots() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("id");
  for (const event of data ?? []) {
    await keepDailySnapshot(event.id, "roster");
    await keepDailySnapshot(event.id, "tasks");
  }
}

export async function saveManualSnapshot(
  eventId: string,
  kind: SnapshotKind,
): Promise<{ saved: boolean }> {
  const payload = await currentPayload(eventId, kind);
  const latest = await latestSnapshot(eventId, kind);
  if (latest && samePayload(latest.payload, payload)) return { saved: false };
  const supabase = createAdminClient();
  const { error } = await supabase.from("event_snapshots").insert({
    event_id: eventId,
    kind,
    source: "manual",
    payload,
  });
  if (error) throw error;
  return { saved: true };
}

export async function listSnapshots(eventId: string, kind: SnapshotKind): Promise<SnapshotListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_snapshots")
    .select("id, source, created_at")
    .eq("event_id", eventId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    source: row.source as SnapshotSource,
    createdAt: row.created_at,
  }));
}

export async function readSnapshot(eventId: string, id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_snapshots")
    .select("id, kind, source, payload, created_at")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data as {
    id: string;
    kind: SnapshotKind;
    source: SnapshotSource;
    payload: RosterSnapshotPerson[] | TaskSnapshotItem[];
    created_at: string;
  } | null;
}
