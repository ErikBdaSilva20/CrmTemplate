// Pure dashboard analytics functions, extracted from DashboardScreen
// (AUDITORIA-CODIGO.md §2): the screen used to compute funnel, monthly
// revenue trend, at-risk deals, period-over-period variation, and activity
// breakdowns inline across ~10 `useMemo` blocks, mixing business logic with
// JSX. Pulling them out here makes each calculation independently testable
// and keeps the screen focused on layout.
import { ACTIVITY_TYPE, CONTACT_STATUS } from "@/lib/domain";
import { monthsUntil } from "@/lib/format";
import type { Activity, Contact, Deal, PipelineStage } from "@/lib/data";

export type PeriodFilter = "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "all";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function computePercentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export function getPeriodStart(period: PeriodFilter, now = new Date()): Date | null {
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "this_week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "this_month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "this_quarter":
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "this_year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export function isInPeriod(dateStr: string | null, start: Date | null): boolean {
  if (!start || !dateStr) return true;
  return new Date(dateStr) >= start;
}

export function computeAverageSalesCycleDays(wonDeals: Deal[]): number {
  if (wonDeals.length === 0) return 0;
  const totalDays = wonDeals.reduce((sum, deal) => {
    const created = new Date(deal.created_at);
    const updated = deal.updated_at ? new Date(deal.updated_at) : new Date();
    return sum + Math.floor((updated.getTime() - created.getTime()) / 86_400_000);
  }, 0);
  return Math.round(totalDays / wonDeals.length);
}

// Won revenue in the equivalent previous period (e.g. last month, for
// "this_month"), used to compute the period-over-period variation badge.
export function computePreviousPeriodRevenue(deals: Deal[], period: PeriodFilter, now = new Date()): number {
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case "this_month":
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "this_quarter": {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      prevStart = new Date(now.getFullYear(), quarterStart - 3, 1);
      prevEnd = new Date(now.getFullYear(), quarterStart, 0);
      break;
    }
    default:
      return 0;
  }

  return deals
    .filter(
      (d) =>
        d.status === "won" &&
        d.created_at &&
        new Date(d.created_at) >= prevStart &&
        new Date(d.created_at) <= prevEnd,
    )
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);
}

export interface MonthlyRevenuePoint {
  month: string;
  receita: number;
  tendencia: number;
}

// Last 12 months of won revenue, plus a 3-month trailing-average trend line.
export function computeMonthlyRevenue(deals: Deal[], now = new Date()): MonthlyRevenuePoint[] {
  const points: MonthlyRevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const wonInMonth = deals.filter((deal) => {
      if (deal.status !== "won" || !deal.created_at) return false;
      const closedAt = new Date(deal.created_at);
      return closedAt.getFullYear() === monthDate.getFullYear() && closedAt.getMonth() === monthDate.getMonth();
    });
    points.push({
      month: MONTHS_PT[monthDate.getMonth()],
      receita: wonInMonth.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
      tendencia: 0,
    });
  }
  for (let i = 0; i < points.length; i++) {
    const window = points.slice(Math.max(0, i - 2), i + 1);
    points[i].tendencia = Math.round(window.reduce((sum, p) => sum + p.receita, 0) / window.length);
  }
  return points;
}

export interface FunnelStage {
  id: string;
  name: string;
  count: number;
  value: number;
  color: string;
}

export function computeFunnel(stages: PipelineStage[], openDeals: Deal[]): FunnelStage[] {
  return [...stages]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((stage) => {
      const stageDeals = openDeals.filter((d) => d.stage_id === stage.id);
      return {
        id: stage.id,
        name: stage.name,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
        color: stage.color || "hsl(var(--primary))",
      };
    });
}

// Deals for one stage, highest value first — feeds the Dashboard's
// expandable "Pipeline por Estágio" rows.
export function computeStageDeals(openDeals: Deal[], stageId: string): Deal[] {
  return openDeals
    .filter((d) => d.stage_id === stageId)
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
}

// Deals mais relevantes para o card de resumo do Dashboard: maior
// qualification_score primeiro, depois maior valor, depois close_date mais
// próxima (deals sem close_date ficam por último).
export function selectTopDeals<T extends Deal>(openDeals: T[], limit = 4): T[] {
  return [...openDeals]
    .sort((a, b) => {
      const scoreDiff = (b.qualification_score || 0) - (a.qualification_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const valueDiff = (Number(b.value) || 0) - (Number(a.value) || 0);
      if (valueDiff !== 0) return valueDiff;
      if (!a.close_date && !b.close_date) return 0;
      if (!a.close_date) return 1;
      if (!b.close_date) return -1;
      return new Date(a.close_date).getTime() - new Date(b.close_date).getTime();
    })
    .slice(0, limit);
}

export type DealPriorityLevel = "urgent" | "risk" | "stale" | "none";

export interface DealPriority {
  level: DealPriorityLevel;
  reasons: DealPriorityLevel[];
}

const STALE_DAYS_DEFAULT = 14;
const HIGH_VALUE_THRESHOLD_DEFAULT = 10_000;

// Sinaliza deals abertos que precisam de atenção prioritária no Kanban:
// fechamento vencido/no mês atual ("urgent" — close_date tem granularidade de
// mês neste schema, ver MonthYearSelect, por isso usa monthsUntil <= 0 em vez
// de uma janela de dias), sem atividade recente ("stale"), ou BANT baixo num
// deal de alto valor ("risk"). qualification_score === 0 é tratado como
// "nunca avaliado" (não conta para "risk") para não marcar falsamente
// deals que simplesmente não passaram por qualificação ainda.
export function dealPriority(
  deal: Deal,
  activities: Activity[],
  now = new Date(),
  staleDays = STALE_DAYS_DEFAULT,
  highValueThreshold = HIGH_VALUE_THRESHOLD_DEFAULT,
): DealPriority {
  const reasons: DealPriorityLevel[] = [];

  if (deal.close_date && monthsUntil(deal.close_date, now) <= 0) reasons.push("urgent");

  const lastActivityAt = activities
    .filter((a) => a.deal_id === deal.id && a.created_at)
    .reduce<Date | null>((latest, a) => {
      const d = new Date(a.created_at!);
      return !latest || d > latest ? d : latest;
    }, null);
  const referenceDate = lastActivityAt ?? new Date(deal.created_at);
  const daysSinceActivity = Math.floor((now.getTime() - referenceDate.getTime()) / 86_400_000);
  if (daysSinceActivity > staleDays) reasons.push("stale");

  const isHighValue = (Number(deal.value) || 0) >= highValueThreshold;
  const isLowBant = deal.qualification_score > 0 && deal.qualification_score < 50;
  if (isHighValue && isLowBant) reasons.push("risk");

  const level = reasons.includes("urgent")
    ? "urgent"
    : reasons.includes("risk")
      ? "risk"
      : reasons.includes("stale")
        ? "stale"
        : "none";

  return { level, reasons };
}

export interface AtRiskDeals {
  inactive: Deal[];
  closingSoon: Deal[];
}

// Two risk signals: open deals untouched for 14+ days (ranked by value), and
// open deals with a recurring closing month that's already due (this month or
// overdue) with less than 50% probability.
export function computeAtRiskDeals(openDeals: Deal[], now = new Date()): AtRiskDeals {
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

  const inactive = openDeals
    .filter((d) => (d.updated_at ? new Date(d.updated_at) < fourteenDaysAgo : true))
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, 5);

  const closingSoon = openDeals
    .filter((d) => d.close_date && monthsUntil(d.close_date, now) <= 0 && (Number(d.probability) || 0) < 50)
    .sort((a, b) => new Date(a.close_date!).getTime() - new Date(b.close_date!).getTime());

  return { inactive, closingSoon };
}

export interface NamedCount {
  name: string;
  value: number;
}

export function computeActivitiesByType(activities: Activity[]): NamedCount[] {
  const counts: Partial<Record<Activity["type"], number>> = {};
  activities.forEach((a) => {
    counts[a.type] = (counts[a.type] || 0) + 1;
  });
  return Object.entries(counts).map(([type, count]) => ({
    name: ACTIVITY_TYPE[type as Activity["type"]].label,
    value: count ?? 0,
  }));
}

export interface WeekdayCount {
  day: string;
  count: number;
}

export function computeActivitiesByDayOfWeek(activities: Activity[]): WeekdayCount[] {
  const counts = new Array(7).fill(0);
  activities.forEach((a) => {
    if (a.created_at) counts[new Date(a.created_at).getDay()]++;
  });
  return WEEKDAYS_PT.map((day, i) => ({ day, count: counts[i] }));
}

export function computeNewLeadsByStatus(contacts: Contact[], periodStart: Date | null): NamedCount[] {
  const periodContacts = contacts.filter((c) => isInPeriod(c.created_at, periodStart));
  const counts: Partial<Record<Contact["status"], number>> = {};
  periodContacts.forEach((c) => {
    const status = c.status || "lead";
    counts[status] = (counts[status] || 0) + 1;
  });
  return Object.entries(counts).map(([status, count]) => ({
    name: CONTACT_STATUS[status as Contact["status"]].label,
    value: count ?? 0,
  }));
}
