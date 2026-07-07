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
  computeMonthlyRevenue,
  computeNewLeadsByStatus,
  computePercentage,
  computePreviousPeriodRevenue,
  getPeriodStart,
  isInPeriod,
  selectTopDeals,
  type PeriodFilter,
} from '@/lib/analytics';
import { DEFAULT_MONTHLY_REVENUE_GOAL } from '@/lib/constants';
import { enrichDeals } from '@/lib/data';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [pipelineFilter, setPipelineFilter] = useState('all');

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

  const periodStart = getPeriodStart(period);

  const filteredDeals = useMemo(() => {
    let list = deals;
    if (pipelineFilter !== 'all') {
      const pipeStages = stages.filter((s) => s.pipeline_id === pipelineFilter).map((s) => s.id);
      list = list.filter((d) => d.stage_id && pipeStages.includes(d.stage_id));
    }
    return list;
  }, [deals, pipelineFilter, stages]);

  const periodDeals = useMemo(
    () => filteredDeals.filter((d) => isInPeriod(d.created_at, periodStart)),
    [filteredDeals, periodStart]
  );

  const filteredActivities = useMemo(
    () => activities.filter((a) => isInPeriod(a.created_at, periodStart)),
    [activities, periodStart]
  );

  // ── KPIs ───────────────────────────
  const wonDeals = periodDeals.filter((d) => d.status === 'won');
  const openDeals = filteredDeals.filter((d) => d.status === 'open');
  const totalClosed = wonDeals.length + periodDeals.filter((d) => d.status === 'lost').length;
  const wonRevenue = wonDeals.reduce((s, d) => s + d.value, 0);
  const winRate = computePercentage(wonDeals.length, totalClosed);
  const avgTicket = wonDeals.length > 0 ? wonRevenue / wonDeals.length : 0;
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
  const avgCycle = useMemo(() => computeAverageSalesCycleDays(wonDeals), [wonDeals]);

  const prevPeriodRevenue = useMemo(
    () => computePreviousPeriodRevenue(filteredDeals, period),
    [filteredDeals, period]
  );
  const revenueVariation =
    prevPeriodRevenue > 0 ? Math.round(((wonRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100) : 0;

  const monthlyRevenue = useMemo(() => computeMonthlyRevenue(filteredDeals), [filteredDeals]);

  const topDeals = useMemo(() => {
    const enriched = enrichDeals(openDeals, contacts, companies);
    return selectTopDeals(enriched);
  }, [openDeals, contacts, companies]);

  const actByType = useMemo(() => computeActivitiesByType(filteredActivities), [filteredActivities]);
  const actByDay = useMemo(() => computeActivitiesByDayOfWeek(filteredActivities), [filteredActivities]);
  const atRiskDeals = useMemo(() => computeAtRiskDeals(openDeals), [openDeals]);
  const newLeadsByStatus = useMemo(
    () => computeNewLeadsByStatus(contacts, periodStart),
    [contacts, periodStart]
  );

  // Meta do mês: primeira meta de receita cadastrada para o período atual em
  // sales_goals; sem meta cadastrada, cai no fallback de constants.ts
  // (antes era sempre `const monthlyGoal = 100000` — AUDITORIA-CODIGO.md §4.2).
  const monthlyGoal = useMemo(() => {
    const now = new Date();
    const goal = salesGoals.find(
      (g) => g.goal_type === 'revenue' && g.period_month === now.getMonth() + 1 && g.period_year === now.getFullYear()
    );
    return goal ? (goal.target_value ?? DEFAULT_MONTHLY_REVENUE_GOAL) : DEFAULT_MONTHLY_REVENUE_GOAL;
  }, [salesGoals]);

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
          newContactsCount: contacts.filter((c) => isInPeriod(c.created_at, periodStart)).length,
        }}
      />

      <RevenueSection monthlyRevenue={monthlyRevenue} wonRevenue={wonRevenue} monthlyGoal={monthlyGoal} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TopDealsCard topDeals={topDeals} totalOpenCount={openDeals.length} activities={activities} />
        <ActivitiesTypeChart data={actByType} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivitiesByDayChart data={actByDay} />
        <NewLeadsByStatusChart data={newLeadsByStatus} />
      </div>

      <RiskDealsSection atRiskDeals={atRiskDeals} />

      <BantEfficiencyCard deals={filteredDeals} />
    </div>
  );
}
