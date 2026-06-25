import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Trash2, Target, TrendingUp, Pencil,
  ChevronLeft, ChevronRight, Trophy, Phone, Handshake, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  listSalesGoals, createSalesGoal, updateSalesGoal, deleteSalesGoal,
  listDeals, listActivities, listContacts,
  type SalesGoal,
} from "@/lib/data";

const GOAL_TYPES = [
  { value: "revenue", label: "Receita (R$)", icon: TrendingUp, color: "text-emerald-500" },
  { value: "deals_closed", label: "Deals Fechados", icon: Handshake, color: "text-blue-500" },
  { value: "activities", label: "Atividades", icon: Phone, color: "text-amber-500" },
  { value: "new_contacts", label: "Novos Contatos", icon: UserPlus, color: "text-violet-500" },
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function SalesGoalsScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<SalesGoal | null>(null);

  const [form, setForm] = useState({ goal_type: "revenue", target_value: "" });

  // Metas do período (sem org_id; owner setado pelo gateway). Atuais agregados no front.
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [goalsAll, dealsAll, activitiesAll, contactsAll] = await Promise.all([
      listSalesGoals(), listDeals(), listActivities(), listContacts(),
    ]);
    const periodGoals = goalsAll.filter((g) => g.period_month === month && g.period_year === year);
    setGoals(periodGoals);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const inRange = (s: string | null) => s !== null && new Date(s) >= start && new Date(s) < end;

    const wonInPeriod = dealsAll.filter((d) => d.status === "won" && inRange(d.updated_at));
    setActuals({
      revenue: wonInPeriod.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
      deals_closed: wonInPeriod.length,
      activities: activitiesAll.filter((a) => inRange(a.created_at)).length,
      new_contacts: contactsAll.filter((c) => inRange(c.created_at)).length,
    });
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditGoal(null);
    setForm({ goal_type: "revenue", target_value: "" });
    setDialogOpen(true);
  };

  const openEdit = (g: SalesGoal) => {
    setEditGoal(g);
    setForm({ goal_type: g.goal_type, target_value: String(g.target_value) });
    setDialogOpen(true);
  };

  // owner_id setado pelo gateway — não enviar.
  const saveGoal = async () => {
    const payload = {
      goal_type: form.goal_type,
      target_value: parseFloat(form.target_value) || 0,
      period_month: month,
      period_year: year,
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
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const removeGoal = async (id: string) => {
    await deleteSalesGoal(id);
    toast.success("Meta excluída");
    fetchData();
  };

  const navMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  const goalTypeInfo = (type: string) => GOAL_TYPES.find((gt) => gt.value === type) || GOAL_TYPES[0];

  const formatValue = (type: string, value: number) => {
    if (type === "revenue") return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
    return String(value);
  };

  const pct = (current: number, target: number) => target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const currentFor = (g: SalesGoal) => actuals[g.goal_type] ?? 0;

  const summaryByType = useMemo(() => {
    return GOAL_TYPES.map((gt) => {
      const typeGoals = goals.filter((g) => g.goal_type === gt.value);
      const totalTarget = typeGoals.reduce((s, g) => s + Number(g.target_value), 0);
      return { ...gt, count: typeGoals.length, totalTarget, totalCurrent: actuals[gt.value] ?? 0 };
    }).filter((s) => s.count > 0);
  }, [goals, actuals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas de Vendas</h1>
          <p className="text-muted-foreground text-sm">Defina metas mensais e acompanhe o progresso</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" />Nova Meta
        </Button>
      </div>

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

      {/* Summary Cards */}
      {summaryByType.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryByType.map((s) => {
            const Icon = s.icon;
            const p = pct(s.totalCurrent, s.totalTarget);
            return (
              <Card key={s.value}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="text-xl font-bold">{formatValue(s.value, s.totalCurrent)}</div>
                  <div className="text-xs text-muted-foreground mb-2">de {formatValue(s.value, s.totalTarget)}</div>
                  <Progress value={p} className="h-1.5" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{p}% atingido</span>
                    {p >= 100 && <Trophy className="h-3 w-3 text-amber-500" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goals Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Metas do Período</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mês</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="mr-1 h-3 w-3" />Criar primeira meta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Meta</TableHead>
                  <TableHead className="text-xs text-right">Atual</TableHead>
                  <TableHead className="text-xs w-[140px]">Progresso</TableHead>
                  <TableHead className="text-xs w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((g) => {
                  const info = goalTypeInfo(g.goal_type);
                  const Icon = info.icon;
                  const current = currentFor(g);
                  const p = pct(current, Number(g.target_value));
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${info.color}`} />
                          {info.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatValue(g.goal_type, Number(g.target_value))}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {formatValue(g.goal_type, current)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p} className="h-1.5 flex-1" />
                          <span className={`text-[10px] font-medium ${p >= 100 ? "text-emerald-500" : ""}`}>
                            {p}%
                          </span>
                          {p >= 100 && <Trophy className="h-3 w-3 text-amber-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(g)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Editar">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeGoal(g.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Excluir">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
