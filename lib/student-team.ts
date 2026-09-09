import type { SupabaseClient } from "@supabase/supabase-js";

export async function reassignStudentTeam(
  supabase: SupabaseClient,
  eventId: string,
  studentId: string,
  teamId: string,
) {
  const [{ data: tasks }, { data: broadcasts }] = await Promise.all([
    supabase.from("tasks").select("id").eq("event_id", eventId),
    supabase.from("broadcasts").select("id").eq("event_id", eventId),
  ]);
  const taskIds = (tasks ?? []).map((task) => task.id);
  const broadcastIds = (broadcasts ?? []).map((item) => item.id);
  await Promise.all([
    taskIds.length
      ? supabase
          .from("submissions")
          .update({ team_id: teamId })
          .eq("student_id", studentId)
          .in("task_id", taskIds)
      : Promise.resolve(),
    broadcastIds.length
      ? supabase
          .from("broadcast_responses")
          .update({ team_id: teamId })
          .eq("student_id", studentId)
          .in("broadcast_id", broadcastIds)
      : Promise.resolve(),
  ]);
}

export async function reassignStudentId(
  supabase: SupabaseClient,
  eventId: string,
  fromId: string,
  toId: string,
) {
  if (fromId === toId) return;

  const [{ data: tasks }, { data: broadcasts }] = await Promise.all([
    supabase.from("tasks").select("id").eq("event_id", eventId),
    supabase.from("broadcasts").select("id").eq("event_id", eventId),
  ]);
  const taskIds = (tasks ?? []).map((task) => task.id);
  const broadcastIds = (broadcasts ?? []).map((item) => item.id);

  if (taskIds.length) {
    const { data: taken } = await supabase
      .from("submissions")
      .select("task_id")
      .eq("student_id", toId)
      .in("task_id", taskIds);
    if (taken?.length) {
      return { ok: false as const, error: "這個學號已經有回傳，不能改成這個號碼" };
    }
    const { error } = await supabase
      .from("submissions")
      .update({ student_id: toId })
      .eq("student_id", fromId)
      .in("task_id", taskIds);
    if (error) return { ok: false as const, error: error.message };
  }

  if (broadcastIds.length) {
    const { data: taken } = await supabase
      .from("broadcast_responses")
      .select("broadcast_id")
      .eq("student_id", toId)
      .in("broadcast_id", broadcastIds);
    const takenIds = (taken ?? []).map((row) => row.broadcast_id);
    if (takenIds.length) {
      await supabase
        .from("broadcast_responses")
        .delete()
        .eq("student_id", fromId)
        .in("broadcast_id", takenIds);
    }
    const { error } = await supabase
      .from("broadcast_responses")
      .update({ student_id: toId })
      .eq("student_id", fromId)
      .in("broadcast_id", broadcastIds);
    if (error) return { ok: false as const, error: error.message };
  }

  const { data: takenLikes } = await supabase
    .from("submission_likes")
    .select("submission_id")
    .eq("event_id", eventId)
    .eq("student_id", toId);
  const takenLikeIds = (takenLikes ?? []).map((row) => row.submission_id);
  if (takenLikeIds.length) {
    await supabase
      .from("submission_likes")
      .delete()
      .eq("event_id", eventId)
      .eq("student_id", fromId)
      .in("submission_id", takenLikeIds);
  }
  const { error } = await supabase
    .from("submission_likes")
    .update({ student_id: toId })
    .eq("event_id", eventId)
    .eq("student_id", fromId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
