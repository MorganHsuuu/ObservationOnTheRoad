import { taskCode } from "@/lib/time";
import type { TaskRow } from "@/lib/types";

type NumberableTask = Pick<TaskRow, "id" | "order_index"> & {
  status?: TaskRow["status"];
};

export function sortTasksByOrder<T extends Pick<TaskRow, "order_index">>(tasks: T[]) {
  return [...tasks].sort((a, b) => a.order_index - b.order_index);
}

export function releasedTasks<T extends NumberableTask>(tasks: T[]) {
  return sortTasksByOrder(tasks.filter((task) => task.status !== "draft"));
}

/** 學生看到的題號：只算已發布／已截止，依題庫順序重編 01、02、03，沒發出的不佔號。 */
export function liveTaskNumber(taskId: string, tasks: NumberableTask[]) {
  const released = releasedTasks(tasks);
  const index = released.findIndex((task) => task.id === taskId);
  return index >= 0 ? index + 1 : 0;
}

export function liveTaskCode(taskId: string, tasks: NumberableTask[]) {
  return taskCode(liveTaskNumber(taskId, tasks));
}

/** 任務板上的題號：依題庫排列重編 01、02、03，刪題留下的空洞不顯示。 */
export function boardTaskCode(taskId: string, tasks: NumberableTask[]) {
  const index = sortTasksByOrder(tasks).findIndex((task) => task.id === taskId);
  return taskCode(index >= 0 ? index + 1 : 0);
}

export function adminTaskCodeLabel(task: NumberableTask, tasks: NumberableTask[]) {
  if (task.status === "draft") return taskCode(task.order_index);
  const live = liveTaskNumber(task.id, tasks);
  if (live > 0 && live !== task.order_index) {
    return `${taskCode(task.order_index)}→${taskCode(live)}`;
  }
  return taskCode(live || task.order_index);
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
