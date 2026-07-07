import { DashboardHeader } from '@/components/crm/dashboard/DashboardHeader';
import { DashboardKpiCards } from '@/components/crm/dashboard/DashboardKpiCards';
import { RevenueSection } from '@/components/crm/dashboard/RevenueSection';
import { TopDealsCard } from '@/components/crm/dashboard/TopDealsCard';
import { ActivitiesTypeChart } from '@/components/crm/dashboard/ActivitiesTypeChart';
import { ActivitiesByDayChart } from '@/components/crm/dashboard/ActivitiesByDayChart';
import { NewLeadsByStatusChart } from '@/components/crm/dashboard/NewLeadsByStatusChart';
import { RiskDealsSection } from '@/components/crm/dashboard/RiskDealsSection';
import { BantEfficiencyCard } from '@/components/crm/dashboard/BantEfficiencyCard';
import { useActivities } from '@/hooks/useActivities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useDeals } from '@/hooks/useDeals';
import { usePipelines, useStages } from '@/hooks/usePipelines';
import { useSalesGoals } from '@/hooks/useSalesGoals';
import {
  computeActivitiesByDayOfWeek,
  computeActivitiesByType,
  computeAtRiskDeals,
  computeAverageSalesCycleDays,
  computeNewLeadsByStatus,
  computePercentage,
  selectTopDeals,
} from '@/lib/analytics';
import { DEFAULT_MONTHLY_REVENUE_GOAL } from '@/lib/constants';
import { enrichDeals } from '@/lib/data';
import { type Interval, type Period, previousInterval, resolvePeriod } from '@/lib/period';
import { aggregateByMonth, filterByInterval } from '@/lib/periodAggregation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const REVENUE_CHART_MIN_ANNUAL_SPAN_MS = 365 * 86_400_000;

// Visão Anual (jan-dez do ano do Período) sempre que o Período for um Ano
// específico ou cobrir >= 1 ano (FR-7, PRD §8 Q2, decisão confirmada). É uma
// decisão de exibição do gráfico do Dashboard, não um conceito de Período
// reutilizável — por isso vive aqui, não em src/lib/period.ts.
function isAnnualPeriod(period: Period, interval: Interval): boolean {
  if (period.kind === 'year') return true;
  if (period.kind === 'preset' && period.preset === 'this_year') return true;
  if (interval.start && interval.end) {
    return interval.end.getTime() - interval.start.getTime() >= REVENUE_CHART_MIN_ANNUAL_SPAN_MS;
  }
  return false;
}

// Mês específico que o card de meta deve usar: o próprio Período quando ele
// já resolve a um único mês-calendário; caso contrário `null` (o chamador
// decide o fallback — hoje é sempre o mês-calendário atual, ver FR-8).
function resolveGoalMonth(period: Period, now: Date): { month: number; year: number } | null {
  if (period.kind === 'month') return { month: period.month, year: period.year };
  if (period.kind === 'preset' && period.preset === 'this_month') return { month: now.getMonth() + 1, year: now.getFullYear() };
  return null;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Orquestrador de layout: busca os dados, calcula os agregados via
// lib/analytics.ts (puro/testável) e delega toda a renderização visual para
// os subcomponentes em components/crm/dashboard/**
// (ver Masia Clone-Template Audit Framework §4/§6.1 — "God Component" split).
export default function DashboardScreen() {
  const { data: deals, loading: dealsLoading, refresh: refreshDeals } = useDeals();
  const { data: stages, refresh: refreshStages } = useStages();
  const { data: activities, refresh: refreshActivities } = useActivities();
  const { data: contacts, refresh: refreshContacts } = useContacts();
  const { data: pipelines, refresh: refreshPipelines } = usePipelines();
  const { data: salesGoals, refresh: refreshSalesGoals } = useSalesGoals();
  const { data: companies } = useCompanies();

  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [period, setPeriod] = useState<Period>({ kind: 'preset', preset: 'this_month' });
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const now = new Date();

  // Estável via useCallback (as próprias refreshX vêm de useCallback([])
  // dentro de data-cache.ts) — evita reintroduzir o anti-padrão do
  // eslint-disable que a auditoria original mandou eliminar (§5.4).
  const refreshAll = useCallback(() => {
    setLastRefresh(new Date());
    return Promise.all([
      refreshDeals(),
      refreshStages(),
      refreshActivities(),
      refreshContacts(),
      refreshPipelines(),
      refreshSalesGoals(),
    ]);
  }, [refreshDeals, refreshStages, refreshActivities, refreshContacts, refreshPipelines, refreshSalesGoals]);

  useEffect(() => {
    const timer = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshAll]);

  // Camada compartilhada de Período (src/lib/period.ts) — única fonte de
  // resolução de datas do Dashboard, substitui getPeriodStart/isInPeriod.
  const periodInterval = useMemo(() => resolvePeriod(period, now), [period]);

  const filteredDeals = useMemo(() => {
    let list = deals;
    if (pipelineFilter !== 'all') {
      const pipeStages = stages.filter((s) => s.pipeline_id === pipelineFilter).map((s) => s.id);
      list = list.filter((d) => d.stage_id && pipeStages.includes(d.stage_id));
    }
    return list;
  }, [deals, pipelineFilter, stages]);

  const periodDeals = useMemo(
    () => filterByInterval(filteredDeals, periodInterval, (d) => d.created_at),
    [filteredDeals, periodInterval]
  );

  const filteredActivities = useMemo(
    () => filterByInterval(activities, periodInterval, (a) => a.created_at),
    [activities, periodInterval]
  );

  const periodContacts = useMemo(
    () => filterByInterval(contacts, periodInterval, (c) => c.created_at),
    [contacts, periodInterval]
  );

  // ── KPIs ─────────────────────────── (memoizado — mesmo padrão do resto
  // do arquivo; sem isso, todo re-render do Dashboard refaz filter/reduce
  // nos deals do período mesmo quando periodDeals/filteredDeals não mudam).
  const { wonDeals, openDeals, totalClosed, wonRevenue, winRate, avgTicket, pipelineValue } = useMemo(() => {
    const wonDeals = periodDeals.filter((d) => d.status === 'won');
    const openDeals = filteredDeals.filter((d) => d.status === 'open');
    const totalClosed = wonDeals.length + periodDeals.filter((d) => d.status === 'lost').length;
    const wonRevenue = wonDeals.reduce((s, d) => s + d.value, 0);
    const winRate = computePercentage(wonDeals.length, totalClosed);
    const avgTicket = wonDeals.length > 0 ? wonRevenue / wonDeals.length : 0;
    const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
    return { wonDeals, openDeals, totalClosed, wonRevenue, winRate, avgTicket, pipelineValue };
  }, [periodDeals, filteredDeals]);
  const avgCycle = useMemo(() => computeAverageSalesCycleDays(wonDeals), [wonDeals]);

  // Variação Período-a-Período (FR-6): previousInterval é genérica para
  // qualquer Período, corrigindo o bug em que "Este ano"/"Esta semana"
  // sempre caíam em variação 0 (Auditoria §Bloco 1).
  const prevInterval = useMemo(() => previousInterval(period, now), [period]);
  const prevPeriodRevenue = useMemo(() => {
    if (!prevInterval) return 0;
    return filterByInterval(filteredDeals, prevInterval, (d) => d.created_at)
      .filter((d) => d.status === 'won')
      .reduce((sum, d) => sum + d.value, 0);
  }, [filteredDeals, prevInterval]);
  const revenueVariation =
    prevPeriodRevenue > 0 ? Math.round(((wonRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100) : 0;

  // FR-7: Visão Anual (jan-dez do ano do Período) quando o Período for um
  // Ano específico ou cobrir >= 1 ano; presets curtos/mês específico/"tudo"
  // mantêm "últimos 12 meses" como contexto rotulado (decisão confirmada,
  // PRD §8 Q2) em vez de ocultar o gráfico ou mostrar só o Período curto.
  const isAnnual = useMemo(() => isAnnualPeriod(period, periodInterval), [period, periodInterval]);

  const revenueInterval = useMemo(() => {
    if (isAnnual) return periodInterval;
    const anchor = new Date();
    return {
      start: new Date(anchor.getFullYear(), anchor.getMonth() - 11, 1),
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
      label: 'Últimos 12 meses',
    };
  }, [isAnnual, periodInterval]);

  const revenueChartTitle = isAnnual
    ? `Receita Mensal — ${periodInterval.label}`
    : 'Receita Mensal — Últimos 12 meses (contexto)';

  const monthlyRevenue = useMemo(() => {
    const points = aggregateByMonth(filteredDeals, revenueInterval, (d) => d.created_at, (group) =>
      group.filter((d) => d.status === 'won').reduce((sum, d) => sum + d.value, 0)
    );
    // Média móvel de 3 meses — mesma janela do computeMonthlyRevenue antigo.
    return points.map((p, i) => {
      const window = points.slice(Math.max(0, i - 2), i + 1);
      const tendencia = Math.round(window.reduce((sum, w) => sum + w.value, 0) / window.length);
      return { month: p.month.label, receita: p.value, tendencia };
    });
  }, [filteredDeals, revenueInterval]);

  const topDeals = useMemo(() => {
    const enriched = enrichDeals(openDeals, contacts, companies);
    return selectTopDeals(enriched);
  }, [openDeals, contacts, companies]);

  const actByType = useMemo(() => computeActivitiesByType(filteredActivities), [filteredActivities]);
  const actByDay = useMemo(() => computeActivitiesByDayOfWeek(filteredActivities), [filteredActivities]);
  const atRiskDeals = useMemo(() => computeAtRiskDeals(openDeals), [openDeals]);
  const newLeadsByStatus = useMemo(() => computeNewLeadsByStatus(periodContacts), [periodContacts]);

  // FR-8: meta respeita o Período. Mês específico (ou "Este mês") mostra
  // meta x realizado daquele mês; Visão Anual (mesmo critério do FR-7) vira
  // resumo anual; qualquer outro Período (hoje/semana/trimestre/"tudo") cai
  // no mês-calendário atual — sales_goals só tem period_month/period_year,
  // não há granularidade semanal/trimestral no modelo de dados.
  const goalTargetMonth = resolveGoalMonth(period, now) ?? { month: now.getMonth() + 1, year: now.getFullYear() };

  const goalMonthInterval = useMemo(
    () => resolvePeriod({ kind: 'month', year: goalTargetMonth.year, month: goalTargetMonth.month }),
    [goalTargetMonth.year, goalTargetMonth.month]
  );
  const goalMonthRevenue = useMemo(
    () =>
      filterByInterval(filteredDeals, goalMonthInterval, (d) => d.created_at)
        .filter((d) => d.status === 'won')
        .reduce((sum, d) => sum + d.value, 0),
    [filteredDeals, goalMonthInterval]
  );
  const monthlyGoalTarget = useMemo(() => {
    const goal = salesGoals.find(
      (g) => g.goal_type === 'revenue' && g.period_month === goalTargetMonth.month && g.period_year === goalTargetMonth.year
    );
    return goal ? (goal.target_value ?? DEFAULT_MONTHLY_REVENUE_GOAL) : DEFAULT_MONTHLY_REVENUE_GOAL;
  }, [salesGoals, goalTargetMonth.month, goalTargetMonth.year]);

  // Resumo anual: meta = soma das metas mensais registradas naquele ano (ou
  // uma estimativa de 12x a meta default, se nenhuma meta estiver
  // cadastrada); realizado = soma dos pontos mensais já calculados acima
  // para o gráfico de receita (mesmo intervalo quando isAnnual, sem
  // recalcular a agregação por card — NFR de performance do PRD §4.2).
  const annualGoalTarget = useMemo(() => {
    if (!isAnnual || !periodInterval.start) return 0;
    const year = periodInterval.start.getFullYear();
    const yearGoals = salesGoals.filter((g) => g.goal_type === 'revenue' && g.period_year === year);
    return yearGoals.length > 0
      ? yearGoals.reduce((sum, g) => sum + (g.target_value ?? 0), 0)
      : DEFAULT_MONTHLY_REVENUE_GOAL * 12;
  }, [isAnnual, periodInterval, salesGoals]);
  const annualGoalActual = useMemo(
    () => (isAnnual ? monthlyRevenue.reduce((sum, p) => sum + p.receita, 0) : 0),
    [isAnnual, monthlyRevenue]
  );

  const goalLabel = isAnnual ? 'Meta do Ano' : 'Meta do Mês';
  const goalValue = isAnnual ? annualGoalActual : goalMonthRevenue;
  const goalTarget = isAnnual ? annualGoalTarget : monthlyGoalTarget;

  return (
    <div className="space-y-5">
      <DashboardHeader
        lastRefresh={lastRefresh}
        period={period}
        onPeriodChange={setPeriod}
        pipelines={pipelines}
        pipelineFilter={pipelineFilter}
        onPipelineFilterChange={setPipelineFilter}
        onRefresh={refreshAll}
        refreshing={dealsLoading}
      />

      <DashboardKpiCards
        kpis={{
          wonRevenue,
          revenueVariation,
          wonDealsCount: wonDeals.length,
          pipelineValue,
          winRate,
          totalClosed,
          avgTicket,
          avgCycle,
          contactsCount: contacts.length,
          newContactsCount: periodContacts.length,
        }}
      />

      <RevenueSection
        monthlyRevenue={monthlyRevenue}
        title={revenueChartTitle}
        goalLabel={goalLabel}
        goalValue={goalValue}
        goalTarget={goalTarget}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TopDealsCard topDeals={topDeals} totalOpenCount={openDeals.length} activities={activities} />
        <ActivitiesTypeChart data={actByType} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivitiesByDayChart data={actByDay} />
        <NewLeadsByStatusChart data={newLeadsByStatus} />
      </div>

      <RiskDealsSection atRiskDeals={atRiskDeals} />

      <BantEfficiencyCard deals={periodDeals} />
    </div>
  );
}
