import { taskCode } from "@/lib/time";
import type { TaskRow } from "@/lib/types";

type NumberableTask = Pick<TaskRow, "id" | "order_index"> & {
  status?: TaskRow["status"];
  published_at?: string | null;
};

export function sortTasksByOrder<T extends Pick<TaskRow, "order_index">>(tasks: T[]) {
  return [...tasks].sort((a, b) => a.order_index - b.order_index);
}

export function releasedTasks<T extends NumberableTask>(tasks: T[]) {
  return sortTasksByOrder(tasks.filter((task) => task.status && task.status !== "draft"));
}

/** 第四個發布的題，就算原本排第七，也排到已發布區塊最後，後面草稿往後順延。 */
export function arrangeAfterPublish<T extends { id: string; status?: TaskRow["status"] }>(
  tasks: T[],
  taskId: string,
) {
  const current = tasks.find((task) => task.id === taskId);
  if (!current) return tasks;
  const others = tasks.filter((task) => task.id !== taskId);
  const released = others.filter((task) => task.status && task.status !== "draft");
  const drafts = others.filter((task) => !task.status || task.status === "draft");
  return [...released, current, ...drafts];
}

export function arrangeAfterDraft<T extends { id: string; status?: TaskRow["status"] }>(
  tasks: T[],
  taskId: string,
) {
  const current = tasks.find((task) => task.id === taskId);
  if (!current) return tasks;
  const others = tasks.filter((task) => task.id !== taskId);
  const released = others.filter((task) => task.status && task.status !== "draft");
  const drafts = others.filter((task) => !task.status || task.status === "draft");
  return [...released, ...drafts, current];
}

/** 學生看到的題號：已發布依推播順序；草稿接在後面往後順延。 */
export function liveTaskNumber(taskId: string, tasks: NumberableTask[]) {
  const released = releasedTasks(tasks);
  const index = released.findIndex((task) => task.id === taskId);
  return index >= 0 ? index + 1 : 0;
}

export function liveTaskCode(taskId: string, tasks: NumberableTask[]) {
  const number = liveTaskNumber(taskId, tasks);
  return number > 0 ? taskCode(number) : "";
}

/** 任務板上的題號：畫面順序 01、02、03。發布後會插到已發布後面，草稿往後順延。 */
export function boardTaskCode(taskId: string, tasks: NumberableTask[]) {
  const index = sortTasksByOrder(tasks).findIndex((task) => task.id === taskId);
  return taskCode(index >= 0 ? index + 1 : 0);
}

export function adminTaskCodeLabel(task: NumberableTask, tasks: NumberableTask[]) {
  return boardTaskCode(task.id, tasks);
}

export function currentTask(tasks: TaskRow[]) {
  const published = tasks.filter((task) => task.status === "published");
  if (published.length === 0) return null;
  return published.sort((a, b) => {
    const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
    const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.order_index - a.order_index;
  })[0];
}

export function shortTaskTitle(title: string) {
  return title.replace(/^任務\s*\d+\s*[・·.．]\s*/, "");
}

export function taskStatusLabel(status: TaskRow["status"]) {
  if (status === "published") return "已發布";
  if (status === "closed") return "已截止";
  return "草稿";
}

/** 能不能交：只看這題有沒有發布。活動「封存／籌備」不能擋住已發布的題。 */
export function uploadAllowed(task: Pick<TaskRow, "status">) {
  return task.status === "published";
}
