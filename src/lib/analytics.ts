// Pure dashboard analytics functions, extracted from DashboardScreen
// (AUDITORIA-CODIGO.md §2): the screen used to compute funnel, monthly
// revenue trend, at-risk deals, period-over-period variation, and activity
// breakdowns inline across ~10 `useMemo` blocks, mixing business logic with
// JSX. Pulling them out here makes each calculation independently testable
// and keeps the screen focused on layout.
import { ACTIVITY_TYPE, CONTACT_STATUS } from "@/lib/domain";
import { monthsUntil, daysAgo } from "@/lib/format";
import type { Activity, Contact, Deal, SalesGoal } from "@/lib/data";

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function computePercentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
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

// Deals mais relevantes para o card de resumo do Dashboard: maior
// qualification_score primeiro, depois maior valor, depois close_date mais
// próxima (deals sem close_date ficam por último).
export function selectTopDeals<T extends Deal>(openDeals: T[], limit = 4): T[] {
  return [...openDeals]
    .sort((a, b) => {
      const scoreDiff = (b.qualification_score || 0) - (a.qualification_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const valueDiff = b.value - a.value;
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
  const daysSinceActivity = daysAgo(referenceDate, now);
  if (daysSinceActivity > staleDays) reasons.push("stale");

  const isHighValue = deal.value >= highValueThreshold;
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

// Variante em lote de dealPriority: agrupa activities por deal_id uma única
// vez (O(activities)) em vez de cada chamada de dealPriority refazer um
// filter na lista inteira (O(deals × activities) quando chamada dentro de um
// loop/sort, como no Kanban). Use isto sempre que precisar da prioridade de
// mais de um deal de uma vez.
export function buildDealPriorityMap(
  deals: Deal[],
  activities: Activity[],
  now = new Date(),
  staleDays = STALE_DAYS_DEFAULT,
  highValueThreshold = HIGH_VALUE_THRESHOLD_DEFAULT,
): Map<string, DealPriority> {
  const activitiesByDeal = new Map<string, Activity[]>();
  for (const activity of activities) {
    if (!activity.deal_id) continue;
    const bucket = activitiesByDeal.get(activity.deal_id);
    if (bucket) bucket.push(activity);
    else activitiesByDeal.set(activity.deal_id, [activity]);
  }

  const result = new Map<string, DealPriority>();
  for (const deal of deals) {
    result.set(
      deal.id,
      dealPriority(deal, activitiesByDeal.get(deal.id) ?? [], now, staleDays, highValueThreshold),
    );
  }
  return result;
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
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const closingSoon = openDeals
    .filter((d) => d.close_date && monthsUntil(d.close_date, now) <= 0 && d.probability < 50)
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

// Recebe os contatos já recortados pelo Período ativo (src/lib/period.ts +
// periodAggregation.ts) — o recorte por data não é mais responsabilidade
// desta função, só a quebra por status.
export function computeNewLeadsByStatus(periodContacts: Contact[]): NamedCount[] {
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

// ── Sales Goals (OKR) ────────────────────────────────────────────────────

function goalPeriodRange(month: number, year: number): { start: Date; end: Date } {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

// Realizado de uma meta, escopado pelo vínculo (deal_id/company_id) quando
// houver — sem vínculo, mantém o cálculo global por período/owner.
export function computeGoalActual(
  goal: Pick<SalesGoal, "goal_type" | "deal_id" | "company_id">,
  deals: Deal[],
  activities: Activity[],
  contacts: Contact[],
  month: number,
  year: number,
): number {
  const { start, end } = goalPeriodRange(month, year);
  const inRange = (s: string | null) => s !== null && new Date(s) >= start && new Date(s) < end;

  if (goal.deal_id) {
    const deal = deals.find((d) => d.id === goal.deal_id);
    if (!deal) return 0;
    switch (goal.goal_type) {
      case "revenue":
        return deal.status === "won" ? deal.value : 0;
      case "deals_closed":
        return deal.status === "won" ? 1 : 0;
      case "activities":
        return activities.filter((a) => a.deal_id === goal.deal_id && inRange(a.created_at)).length;
      default:
        return 0;
    }
  }

  const scopedDeals = goal.company_id ? deals.filter((d) => d.company_id === goal.company_id) : deals;
  const scopedActivities = goal.company_id
    ? activities.filter((a) => a.company_id === goal.company_id)
    : activities;
  const scopedContacts = goal.company_id
    ? contacts.filter((c) => c.company_id === goal.company_id)
    : contacts;

  switch (goal.goal_type) {
    case "revenue": {
      const won = scopedDeals.filter((d) => d.status === "won" && inRange(d.updated_at));
      return won.reduce((sum, d) => sum + d.value, 0);
    }
    case "deals_closed":
      return scopedDeals.filter((d) => d.status === "won" && inRange(d.updated_at)).length;
    case "activities":
      return scopedActivities.filter((a) => inRange(a.created_at)).length;
    case "new_contacts":
      return scopedContacts.filter((c) => inRange(c.created_at)).length;
    default:
      return 0;
  }
}

export type GoalPaceStatus = "achieved" | "on_track" | "behind";

// Compara % de progresso com a fração do período já decorrida — "atingida"
// vence os demais, senão "no ritmo" se o progresso acompanha o tempo já
// passado no mês, "atrás" caso contrário.
export function computeGoalPace(
  percent: number,
  month: number,
  year: number,
  now = new Date(),
): GoalPaceStatus {
  if (percent >= 100) return "achieved";
  const { start, end } = goalPeriodRange(month, year);
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalMs);
  const elapsedFraction = totalMs > 0 ? elapsedMs / totalMs : 1;
  return percent / 100 >= elapsedFraction ? "on_track" : "behind";
}

// Projeção linear: se o ritmo atual se mantiver, quanto será realizado ao
// final do período.
export function computeGoalProjection(
  current: number,
  month: number,
  year: number,
  now = new Date(),
): number {
  const { start, end } = goalPeriodRange(month, year);
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalMs);
  const elapsedFraction = totalMs > 0 ? elapsedMs / totalMs : 1;
  if (elapsedFraction <= 0) return current;
  return current / elapsedFraction;
}

export interface MonthlyGoalPoint {
  month: number; // 1-12
  // Distingue "sem meta cadastrada" (nenhuma meta desse tipo nesse mês) de
  // "meta 0" (meta cadastrada com target_value 0) — PRD §4.4 FR-11, decisão
  // confirmada: essa distinção é obrigatória, não cosmética.
  hasGoal: boolean;
  target: number;
  actual: number;
  percent: number;
  pace: GoalPaceStatus | null; // null quando hasGoal é false — ritmo não se aplica a um mês sem meta
  // Variação do realizado vs. o mês anterior do mesmo ano. null em janeiro
  // (sem mês anterior no ano) e quando o mês anterior teve actual === 0 —
  // nesse caso 0% significaria "sem mudança", o que seria enganoso quando
  // na verdade não havia base de comparação.
  momVariation: number | null;
}

// Visão Anual de um tipo de meta (FR-11/FR-12): os 12 meses do ano para um
// único goal_type, reaproveitando computeGoalActual/computeGoalPace por mês
// em vez de reimplementar o cálculo de realizado. `goalsOfType` deve já vir
// filtrada por goal_type (e period_year, opcionalmente) pelo chamador —
// várias metas do mesmo tipo no mesmo mês (ex: uma meta global + uma
// vinculada a um negócio específico) são somadas.
export function computeAnnualGoalSummary(
  goalsOfType: SalesGoal[],
  deals: Deal[],
  activities: Activity[],
  contacts: Contact[],
  year: number,
  now = new Date(),
): MonthlyGoalPoint[] {
  const points: MonthlyGoalPoint[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthGoals = goalsOfType.filter((g) => g.period_month === month && g.period_year === year);
    const hasGoal = monthGoals.length > 0;
    const target = monthGoals.reduce((sum, g) => sum + (g.target_value ?? 0), 0);
    const actual = monthGoals.reduce(
      (sum, g) => sum + computeGoalActual(g, deals, activities, contacts, month, year),
      0,
    );
    const percent = computePercentage(actual, target);
    points.push({
      month,
      hasGoal,
      target,
      actual,
      percent,
      pace: hasGoal ? computeGoalPace(percent, month, year, now) : null,
      momVariation: null,
    });
  }

  for (let i = 1; i < points.length; i++) {
    const prevActual = points[i - 1].actual;
    points[i].momVariation = prevActual > 0 ? Math.round(((points[i].actual - prevActual) / prevActual) * 100) : null;
  }

  return points;
}

// ============================================================================
// ÉPICO: REVOLUÇÃO BANT (Gamificação e Qualificação Inteligente)
// ============================================================================

export type BantTemperature = "hot" | "warm" | "cold" | "ghost";

/**
 * Calcula a "temperatura" térmica de um negócio com base na sua qualificação BANT.
 * Usado para renderizar indicadores visuais gamificados na UI (Story 1) e
 * calcular win-rates (Story 4).
 */
export function getBantTemperature(score: number | null | undefined): BantTemperature {
  const s = score ?? 0;
  if (s >= 75) return "hot";
  if (s >= 50) return "warm";
  if (s > 0) return "cold";
  return "ghost";
}
