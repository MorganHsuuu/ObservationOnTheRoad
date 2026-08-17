import type { ParticipantRow } from "@/lib/types";

type SubmissionBit = {
  task_id: string;
  student_id: string | null;
  team_id: string | null;
};

export function membersOfTeam(people: ParticipantRow[], teamId: string) {
  return people.filter((person) => person.team_id === teamId);
}

export function studentDoneTask(
  submissions: SubmissionBit[],
  studentId: string,
  taskId: string,
) {
  return submissions.some(
    (item) => item.task_id === taskId && item.student_id === studentId,
  );
}

export function teamTaskProgress(
  teamId: string,
  taskId: string | null,
  people: ParticipantRow[],
  submissions: SubmissionBit[],
) {
  const members = membersOfTeam(people, teamId);
  if (!taskId) return { done: 0, total: members.length };
  const done = members.filter((person) =>
    studentDoneTask(submissions, person.student_id, taskId),
  ).length;
  return { done, total: members.length };
}

export function taskPeopleProgress(
  taskId: string,
  people: ParticipantRow[],
  submissions: SubmissionBit[],
) {
  const done = people.filter((person) =>
    studentDoneTask(submissions, person.student_id, taskId),
  ).length;
  return { done, total: people.length };
}
