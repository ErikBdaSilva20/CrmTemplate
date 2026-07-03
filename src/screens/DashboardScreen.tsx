import { useEffect, useState, useMemo, useCallback } from "react";
import { ParticlesCanvas } from "@/components/ParticlesCanvas";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Line, AreaChart, Area, Legend,
} from "recharts";
import {
  DollarSign, Users, Handshake, TrendingUp, TrendingDown,
  Target, Clock, AlertTriangle, RefreshCw, ArrowRight,
  CalendarDays, BarChart3,
} from "lucide-react";
import { useDeals } from "@/hooks/useDeals";
import { useStages, usePipelines } from "@/hooks/usePipelines";
import { useActivities } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useSalesGoals } from "@/hooks/useSalesGoals";
import { formatCurrencyCompact as fmt } from "@/lib/format";
import { DEFAULT_MONTHLY_REVENUE_GOAL } from "@/lib/constants";
import {
  computePercentage, getPeriodStart, isInPeriod, computeAverageSalesCycleDays,
  computePreviousPeriodRevenue, computeMonthlyRevenue, computeFunnel, computeAtRiskDeals,
  computeActivitiesByType, computeActivitiesByDayOfWeek, computeNewLeadsByStatus,
  type PeriodFilter,
} from "@/lib/analytics";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  color: "hsl(var(--popover-foreground))",
  fontSize: 11,
};

const CHART_COLORS = [
  "hsl(148, 62%, 40%)", // verde MasIA
  "hsl(186, 78%, 42%)", // teal/ciano
  "hsl(43, 90%, 50%)",  // ouro
  "hsl(148, 50%, 56%)", // verde claro
  "hsl(186, 65%, 56%)", // ciano claro
  "hsl(0, 72%, 58%)",   // vermelho
  "hsl(262, 72%, 60%)", // roxo
  "hsl(43, 75%, 62%)",  // ouro claro
];

// ── Gauge component ─────────────────────────
function GaugeChart({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const angle = (percentage / 100) * 180;
  const color = percentage >= 100 ? "hsl(var(--success))" : percentage >= 70 ? "hsl(var(--primary))" : percentage >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251.2} 251.2`}
        />
        <text x="100" y="85" textAnchor="middle" className="fill-foreground" fontSize="28" fontWeight="700">
          {Math.round(percentage)}%
        </text>
        <text x="100" y="110" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
          {label}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground mt-1">{fmt(value)} / {fmt(max)}</p>
    </div>
  );
}

// ── Main ─────────────────────────────────────
export default function DashboardScreen() {
  const navigate = useNavigate();

  const { data: deals, loading: dealsLoading, refresh: refreshDeals } = useDeals();
  const { data: stages, refresh: refreshStages } = useStages();
  const { data: activities, refresh: refreshActivities } = useActivities();
  const { data: contacts, refresh: refreshContacts } = useContacts();
  const { data: pipelines, refresh: refreshPipelines } = usePipelines();
  const { data: salesGoals, refresh: refreshSalesGoals } = useSalesGoals();

  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
  const [pipelineFilter, setPipelineFilter] = useState("all");

  // Estável via useCallback (as próprias refreshX vêm de useCallback([])
  // dentro de data-cache.ts) — evita reintroduzir o anti-padrão do
  // eslint-disable que a auditoria original mandou eliminar (§5.4).
  const refreshAll = useCallback(() => {
    setLastRefresh(new Date());
    return Promise.all([
      refreshDeals(), refreshStages(), refreshActivities(),
      refreshContacts(), refreshPipelines(), refreshSalesGoals(),
    ]);
  }, [refreshDeals, refreshStages, refreshActivities, refreshContacts, refreshPipelines, refreshSalesGoals]);

  useEffect(() => {
    const timer = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshAll]);

  const periodStart = getPeriodStart(period);

  const filteredDeals = useMemo(() => {
    let list = deals;
    if (pipelineFilter !== "all") {
      const pipeStages = stages.filter((s) => s.pipeline_id === pipelineFilter).map((s) => s.id);
      list = list.filter((d) => d.stage_id && pipeStages.includes(d.stage_id));
    }
    return list;
  }, [deals, pipelineFilter, stages]);

  const periodDeals = useMemo(() =>
    filteredDeals.filter((d) => isInPeriod(d.created_at, periodStart)),
    [filteredDeals, periodStart]
  );

  const filteredActivities = useMemo(() =>
    activities.filter((a) => isInPeriod(a.created_at, periodStart)),
    [activities, periodStart]
  );

  // ── KPIs ───────────────────────────
  const wonDeals = periodDeals.filter((d) => d.status === "won");
  const openDeals = filteredDeals.filter((d) => d.status === "open");
  const totalClosed = wonDeals.length + periodDeals.filter((d) => d.status === "lost").length;
  const wonRevenue = wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const winRate = computePercentage(wonDeals.length, totalClosed);
  const avgTicket = wonDeals.length > 0 ? wonRevenue / wonDeals.length : 0;
  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const avgCycle = useMemo(() => computeAverageSalesCycleDays(wonDeals), [wonDeals]);

  const prevPeriodRevenue = useMemo(
    () => computePreviousPeriodRevenue(filteredDeals, period),
    [filteredDeals, period],
  );
  const revenueVariation = prevPeriodRevenue > 0
    ? Math.round(((wonRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100)
    : 0;

  const monthlyRevenue = useMemo(() => computeMonthlyRevenue(filteredDeals), [filteredDeals]);

  const funnelData = useMemo(() => {
    const pipeStages = pipelineFilter !== "all"
      ? stages.filter((s) => s.pipeline_id === pipelineFilter)
      : stages;
    return computeFunnel(pipeStages, openDeals);
  }, [stages, openDeals, pipelineFilter]);

  const actByType = useMemo(() => computeActivitiesByType(filteredActivities), [filteredActivities]);
  const actByDay = useMemo(() => computeActivitiesByDayOfWeek(filteredActivities), [filteredActivities]);
  const atRiskDeals = useMemo(() => computeAtRiskDeals(openDeals), [openDeals]);
  const newLeadsByStatus = useMemo(
    () => computeNewLeadsByStatus(contacts, periodStart),
    [contacts, periodStart],
  );

  // Meta do mês: primeira meta de receita cadastrada para o período atual em
  // sales_goals; sem meta cadastrada, cai no fallback de constants.ts
  // (antes era sempre `const monthlyGoal = 100000` — AUDITORIA-CODIGO.md §4.2).
  const monthlyGoal = useMemo(() => {
    const now = new Date();
    const goal = salesGoals.find(
      (g) => g.goal_type === "revenue" && g.period_month === now.getMonth() + 1 && g.period_year === now.getFullYear(),
    );
    return goal ? Number(goal.target_value) || DEFAULT_MONTHLY_REVENUE_GOAL : DEFAULT_MONTHLY_REVENUE_GOAL;
  }, [salesGoals]);

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <div className="dashboard-hero relative overflow-hidden rounded-xl border px-4 py-5 shadow-sm">
        <ParticlesCanvas />
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Atualizado {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="this_week">Esta semana</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
                <SelectItem value="this_quarter">Trimestre</SelectItem>
                <SelectItem value="this_year">Este ano</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
            {pipelines.length > 1 && (
              <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos pipelines</SelectItem>
                  {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" className="h-8" onClick={refreshAll} disabled={dealsLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${dealsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/deals")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Receita</span>
              <DollarSign className="h-3.5 w-3.5 text-success" />
            </div>
            <p className="text-xl font-bold">{fmt(wonRevenue)}</p>
            {revenueVariation !== 0 && (
              <div className={`flex items-center gap-0.5 text-[10px] ${revenueVariation > 0 ? "text-success" : "text-destructive"}`}>
                {revenueVariation > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {revenueVariation > 0 ? "+" : ""}{revenueVariation}% vs anterior
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/deals")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ganhos</span>
              <Handshake className="h-3.5 w-3.5 text-success" />
            </div>
            <p className="text-xl font-bold">{wonDeals.length}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(pipelineValue)} em pipeline</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/deals")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Win Rate</span>
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground">{totalClosed} fechados</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/deals")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold">{fmt(avgTicket)}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/activities")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ciclo Médio</span>
              <Clock className="h-3.5 w-3.5 text-warning" />
            </div>
            <p className="text-xl font-bold">{avgCycle}</p>
            <p className="text-[10px] text-muted-foreground">dias</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/contacts")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contatos</span>
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold">{contacts.length}</p>
            <p className="text-[10px] text-muted-foreground">{contacts.filter((c) => isInPeriod(c.created_at, periodStart)).length} novos</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 1: Revenue chart + Goal gauge ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receita Mensal (últimos 12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
                <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                <Line type="monotone" dataKey="tendencia" stroke="hsl(var(--warning))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Meta do Mês</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <GaugeChart value={wonRevenue} max={monthlyGoal} label={fmt(monthlyGoal)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Pipeline por Estágio</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => navigate("/deals")}>
                Ver pipeline <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="space-y-2">
                {funnelData.map((s) => {
                  const maxVal = Math.max(...funnelData.map((f) => f.value), 1);
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium">{s.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{s.count} negócios</span>
                          <span className="font-medium text-foreground">{fmt(s.value)}</span>
                        </div>
                      </div>
                      <div className="h-5 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full rounded transition-all flex items-center justify-end pr-1"
                          style={{
                            width: `${Math.max((s.value / maxVal) * 100, 3)}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">Nenhum dado</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Atividades por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {actByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={actByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {actByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">Nenhuma atividade</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Activity heatmap + New leads ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Atividades por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={actByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Novos Contatos por Status</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => navigate("/contacts")}>
                Ver todos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {newLeadsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={newLeadsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {newLeadsByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">Nenhum dado</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: At-risk deals ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive" />Negócios sem Atividade ({">"}14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskDeals.inactive.length > 0 ? (
              <div className="space-y-2">
                {atRiskDeals.inactive.map((d) => {
                  const daysSince = d.updated_at ? Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000) : 999;
                  return (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-2 cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => navigate(`/deals/${d.id}`)}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{d.title}</p>
                        <p className="text-[10px] text-muted-foreground">{daysSince} dias sem atividade</p>
                      </div>
                      <span className="text-xs font-bold text-destructive shrink-0">{fmt(Number(d.value) || 0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">Nenhum negócio em risco 🎉</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-warning" />Fechamento Próximo (prob {"<"} 50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskDeals.closingSoon.length > 0 ? (
              <div className="space-y-2">
                {atRiskDeals.closingSoon.slice(0, 5).map((d) => {
                  const daysLeft = d.close_date ? Math.ceil((new Date(d.close_date).getTime() - Date.now()) / 86400000) : 0;
                  return (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-warning/20 bg-warning/5 p-2 cursor-pointer hover:bg-warning/10 transition-colors" onClick={() => navigate(`/deals/${d.id}`)}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{d.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {daysLeft <= 0 ? "Vencido" : `${daysLeft} dias`} · {Number(d.probability) || 0}% prob
                        </p>
                      </div>
                      <span className="text-xs font-bold text-warning shrink-0">{fmt(Number(d.value) || 0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">Nenhum negócio com fechamento próximo</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
