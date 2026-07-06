// Lógica pura do Kanban de Tasks (fix-epic 05). Sem campo de status dedicado
// no schema (activities só tem due_date/completed_at), as colunas são buckets
// de prazo/estado derivados no front: Vencidas → Hoje → Próximas → Concluídas.
import { startOfDay, endOfDay } from "@/lib/date";
import type { Activity } from "@/lib/data";

export type TaskBucket = "overdue" | "today" | "upcoming" | "done";

export const TASK_BUCKETS: TaskBucket[] = ["overdue", "today", "upcoming", "done"];

export const TASK_BUCKET_LABELS: Record<TaskBucket, string> = {
  overdue: "Vencidas",
  today: "Hoje",
  upcoming: "Próximas",
  done: "Concluídas",
};

// Concluída vence os demais critérios; sem due_date cai em "Próximas".
export function getTaskBucket(task: Pick<Activity, "due_date" | "completed_at">, now = new Date()): TaskBucket {
  if (task.completed_at) return "done";
  if (!task.due_date) return "upcoming";
  const due = new Date(task.due_date);
  if (due < startOfDay(now)) return "overdue";
  if (due <= endOfDay(now)) return "today";
  return "upcoming";
}

// due_date alvo ao soltar um card numa coluna de prazo: "Hoje" = hoje,
// "Próximas" = +7 dias, "Vencidas" = ontem (ainda permite marcar
// explicitamente como vencida, embora seja o caso menos comum de arrastar).
export function dueDateForBucket(bucket: Exclude<TaskBucket, "done">, now = new Date()): string {
  const target = new Date(now);
  if (bucket === "overdue") target.setDate(target.getDate() - 1);
  if (bucket === "upcoming") target.setDate(target.getDate() + 7);
  return target.toISOString();
}
