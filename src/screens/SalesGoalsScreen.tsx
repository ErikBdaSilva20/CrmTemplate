import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Target, Pencil,
  ChevronLeft, ChevronRight, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { roleAtLeast, useAuth } from "@/lib/auth";
import { useSalesGoals } from "@/hooks/useSalesGoals";
import { useDeals } from "@/hooks/useDeals";
import { useActivities } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { createSalesGoal, updateSalesGoal, deleteSalesGoal, type SalesGoal } from "@/lib/data";
import { computeGoalActual, computeGoalPace, computeGoalProjection, computeAnnualGoalSummary } from "@/lib/analytics";
import { getSelectableYears } from "@/lib/period";
import { GOAL_TYPES, goalTypeInfo, formatGoalValue, PACE_STYLES } from "@/components/crm/salesGoals/goalTypes";
import { AnnualGoalsGrid, type GoalTypeAnnualRow } from "@/components/crm/salesGoals/AnnualGoalsGrid";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type LinkType = "none" | "deal" | "company";

interface GoalForm {
  goal_type: string;
  target_value: string;
  linkType: LinkType;
  linkId: string;
}

const EMPTY_FORM: GoalForm = { goal_type: "revenue", target_value: "", linkType: "none", linkId: "" };

export default function SalesGoalsScreen() {
  const { role } = useAuth();
  // Metas são config estrutural (mesma natureza de pipeline) — criar/editar/
  // excluir é admin/manager; rep só acompanha.
  const canManage = roleAtLeast(role, "manager");

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  // FR-10: alterna entre a visão de mês único (existente) e a Visão Anual
  // (FR-11) — o ano selecionado é compartilhado entre as duas visões.
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const selectableYears = useMemo(() => getSelectableYears(), []);

  const { data: allGoals, loading, refresh: refreshGoals } = useSalesGoals();
  const { data: deals } = useDeals();
  const { data: activities } = useActivities();
  const { data: contacts } = useContacts();
  const { data: companies } = useCompanies();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<SalesGoal | null>(null);

  const [form, setForm] = useState<GoalForm>(EMPTY_FORM);

  // Metas do período (sem org_id; owner setado pelo gateway). Realizado
  // agregado no front, escopado pelo vínculo (deal_id/company_id) de cada meta.
  const goals = useMemo(
    () => allGoals.filter((g) => g.period_month === month && g.period_year === year),
    [allGoals, month, year],
  );

  // Visão Anual (FR-11/FR-12): uma linha por goal_type com pelo menos uma
  // meta no ano selecionado; computeAnnualGoalSummary reaproveita
  // computeGoalActual/computeGoalPace por mês (src/lib/analytics.ts).
  const annualRows = useMemo((): GoalTypeAnnualRow[] => {
    const goalsInYear = allGoals.filter((g) => g.period_year === year);
    const typesInYear = GOAL_TYPES.filter((gt) => goalsInYear.some((g) => g.goal_type === gt.value));
    return typesInYear.map((gt) => ({
      goalType: gt.value,
      points: computeAnnualGoalSummary(
        goalsInYear.filter((g) => g.goal_type === gt.value),
        deals,
        activities,
        contacts,
        year,
      ),
    }));
  }, [allGoals, deals, activities, contacts, year]);

  const openCreate = () => {
    setEditGoal(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (g: SalesGoal) => {
    setEditGoal(g);
    setForm({
      goal_type: g.goal_type,
      target_value: String(g.target_value),
      linkType: g.deal_id ? "deal" : g.company_id ? "company" : "none",
      linkId: g.deal_id || g.company_id || "",
    });
    setDialogOpen(true);
  };

  // owner_id setado pelo gateway — não enviar. deal_id/company_id são
  // mutuamente exclusivos: só o vínculo escolhido em `linkType` é enviado.
  const saveGoal = async () => {
    const payload = {
      goal_type: form.goal_type,
      target_value: parseFloat(form.target_value) || 0,
      period_month: month,
      period_year: year,
      deal_id: form.linkType === "deal" && form.linkId ? form.linkId : null,
      company_id: form.linkType === "company" && form.linkId ? form.linkId : null,
    };
    try {
      if (editGoal) {
        await updateSalesGoal(editGoal.id, payload);
        toast.success("Meta atualizada");
      } else {
        await createSalesGoal(payload);
        toast.success("Meta criada");
      }
      setDialogOpen(false);
      refreshGoals();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const removeGoal = async (id: string) => {
    try {
      await deleteSalesGoal(id);
      toast.success("Meta excluída");
      refreshGoals();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir meta");
    }
  };

  const navMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  const pct = (current: number, target: number) => target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas de Vendas</h1>
          <p className="text-muted-foreground text-sm">Defina metas mensais no estilo OKR e acompanhe o progresso</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedToggle
            options={[{ value: "month", label: "Mês" }, { value: "year", label: "Ano" }]}
            value={viewMode}
            onChange={setViewMode}
          />
          {/* Criar meta continua exigindo um mês específico — a Visão Anual é
              leitura/acompanhamento, não uma segunda forma de criação. */}
          {viewMode === "month" && canManage && (
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-1 h-4 w-4" />Nova Meta
            </Button>
          )}
        </div>
      </div>

      {viewMode === "year" ? (
        <>
          <div className="flex items-center justify-center gap-2">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AnnualGoalsGrid rows={annualRows} year={year} />
        </>
      ) : (
        <>
          {/* Month Navigator */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[180px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Goal Cards (OKR) */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mês</p>
                {canManage && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
                    <Plus className="mr-1 h-3 w-3" />Criar primeira meta
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((g) => {
                const info = goalTypeInfo(g.goal_type);
                const Icon = info.icon;
                const current = computeGoalActual(g, deals, activities, contacts, month, year);
                const target = g.target_value;
                const p = pct(current, target);
                const remaining = Math.max(target - current, 0);
                const pace = computeGoalPace(p, month, year);
                const projection = computeGoalProjection(current, month, year);
                const objective = g.deal_id
                  ? deals.find((d) => d.id === g.deal_id)?.title
                  : g.company_id
                    ? companies.find((c) => c.id === g.company_id)?.name
                    : null;

                return (
                  <Card key={g.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className={`h-4 w-4 shrink-0 ${info.color}`} />
                          <div className="min-w-0">
                            <CardTitle className="truncate text-sm">{info.label}</CardTitle>
                            {objective && (
                              <p className="truncate text-[10px] text-muted-foreground">🎯 {objective}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className={`shrink-0 text-[10px] ${PACE_STYLES[pace].badge}`}>
                          {PACE_STYLES[pace].label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-bold">{formatGoalValue(g.goal_type, current)}</span>
                          <span className="text-xs text-muted-foreground">de {formatGoalValue(g.goal_type, target)}</span>
                        </div>
                        <Progress value={p} className="mt-1.5 h-1.5" />
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {p}% · restam {formatGoalValue(g.goal_type, remaining)}
                          </span>
                          {p >= 100 && <Trophy className="h-3 w-3 text-amber-500" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Projeção ao final do período:{" "}
                        <span className="font-medium text-foreground">{formatGoalValue(g.goal_type, projection)}</span>
                      </p>
                      {canManage && (
                        <div className="flex justify-end gap-1 border-t border-border pt-1">
                          <button onClick={() => openEdit(g)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Editar">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeGoal(g.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Excluir">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de meta</Label>
              <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((gt) => (
                    <SelectItem key={gt.value} value={gt.value}>{gt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Valor da meta</Label>
              <Input
                type="number"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                placeholder={form.goal_type === "revenue" ? "50000" : "10"}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vincular a (opcional — estilo OKR)</Label>
              <Select
                value={form.linkType}
                onValueChange={(v) => setForm({ ...form, linkType: v as LinkType, linkId: "" })}
              >
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Meta global</SelectItem>
                  <SelectItem value="deal">Negócio específico</SelectItem>
                  <SelectItem value="company">Empresa específica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.linkType === "deal" && (
              <div className="space-y-1">
                <Label className="text-xs">Negócio</Label>
                <Select value={form.linkId} onValueChange={(v) => setForm({ ...form, linkId: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar negócio" /></SelectTrigger>
                  <SelectContent>
                    {deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.linkType === "company" && (
              <div className="space-y-1">
                <Label className="text-xs">Empresa</Label>
                <Select value={form.linkId} onValueChange={(v) => setForm({ ...form, linkId: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={saveGoal}>{editGoal ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
