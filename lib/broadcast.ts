import type { BroadcastKind } from "@/lib/types";

export function broadcastKindLabel(kind: BroadcastKind) {
  if (kind === "ack") return "公告";
  if (kind === "yesno") return "是非題";
  return "選擇題";
}

export function answerLabel(kind: BroadcastKind, answer: string) {
  if (kind === "ack") return "了解";
  if (kind === "yesno") return answer === "yes" ? "是" : "否";
  return answer;
}

export function isStudentOnline(lastSeenAt: string, now = Date.now()) {
  return now - new Date(lastSeenAt).getTime() < 3 * 60 * 1000;
}
