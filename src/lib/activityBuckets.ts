// Buckets operacionais de Activities/Tasks — filtros relativos de curto
// prazo orientados a tarefa ("o que fazer agora"), distintos do Período
// analítico (src/lib/period.ts, "como foi o intervalo X" — Glossário do
// PRD §3). ActivitiesScreen.tsx e TasksScreen.tsx reimplementavam este
// switch quase identicamente (Auditoria §2.8/§2.10); esta é a única
// implementação agora (FR-15) — consolidação, não mudança de comportamento.
import { startOfDay, endOfDay, getWeekRange } from "@/lib/date";

export type OperationalBucket =
  | "todo"
  | "done"
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "next_30_days";

export interface Bucketable {
  due_date: string | null;
  completed_at: string | null;
}

interface BucketRanges {
  now: Date;
  todayStart: Date;
  todayEnd: Date;
  tomorrowStart: Date;
  tomorrowEnd: Date;
  weekStart: Date;
  weekEnd: Date;
  nextWeekStart: Date;
  nextWeekEnd: Date;
  next30End: Date;
}

function computeBucketRanges(now: Date): BucketRanges {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const tomorrowEnd = endOfDay(tomorrowStart);
  const thisWeek = getWeekRange(0, now);
  const nextWeek = getWeekRange(1, now);
  const next30End = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
  return {
    now,
    todayStart,
    todayEnd,
    tomorrowStart,
    tomorrowEnd,
    weekStart: thisWeek.start,
    weekEnd: thisWeek.end,
    nextWeekStart: nextWeek.start,
    nextWeekEnd: nextWeek.end,
    next30End,
  };
}

// Um item pertence a um Bucket. "todo"/"done" só olham completed_at; todos
// os demais exigem !completed_at E due_date dentro da janela correspondente
// (mesma semântica das duas implementações que este módulo substitui).
function matchesBucket(item: Bucketable, bucket: OperationalBucket, ranges: BucketRanges): boolean {
  if (bucket === "done") return !!item.completed_at;
  if (item.completed_at) return false;
  if (bucket === "todo") return true;

  const dueDate = item.due_date ? new Date(item.due_date) : null;
  if (!dueDate) return false;

  switch (bucket) {
    case "overdue":
      return dueDate < ranges.now;
    case "today":
      return dueDate >= ranges.todayStart && dueDate <= ranges.todayEnd;
    case "tomorrow":
      return dueDate >= ranges.tomorrowStart && dueDate <= ranges.tomorrowEnd;
    case "this_week":
      return dueDate >= ranges.weekStart && dueDate <= ranges.weekEnd;
    case "next_week":
      return dueDate >= ranges.nextWeekStart && dueDate <= ranges.nextWeekEnd;
    case "next_30_days":
      return dueDate >= ranges.todayStart && dueDate <= ranges.next30End;
  }
}

export function filterByBucket<T extends Bucketable>(items: T[], bucket: OperationalBucket, now = new Date()): T[] {
  const ranges = computeBucketRanges(now);
  return items.filter((item) => matchesBucket(item, bucket, ranges));
}

// Contagem por bucket para os contadores exibidos nas abas — os ranges são
// calculados uma única vez para todos os buckets pedidos, em vez de cada
// tela recalculá-los a cada chamada de filter() separada como antes.
export function countByBucket<T extends Bucketable>(
  items: T[],
  buckets: OperationalBucket[],
  now = new Date(),
): Record<string, number> {
  const ranges = computeBucketRanges(now);
  const counts: Record<string, number> = {};
  for (const bucket of buckets) {
    counts[bucket] = items.filter((item) => matchesBucket(item, bucket, ranges)).length;
  }
  return counts;
}
