import type { Task } from "../repository/types";

export function isOverdue(task: Task, now: Date): boolean {
  return task.status === "open" && new Date(task.dueAt).getTime() < now.getTime();
}

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Open, not yet overdue, and due within the next 24 hours (inclusive). Never true when `isOverdue` is. */
export function isDueSoon(task: Task, now: Date): boolean {
  const dueAt = new Date(task.dueAt).getTime();
  return task.status === "open" && dueAt >= now.getTime() && dueAt <= now.getTime() + DUE_SOON_WINDOW_MS;
}

export function compareByDueDate(a: Task, b: Task): number {
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() || a.id.localeCompare(b.id);
}
