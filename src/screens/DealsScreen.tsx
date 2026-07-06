import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Kanban, KanbanSquare, List, Plus, Filter, Settings2, XCircle, Trophy, RotateCcw, X,
} from "lucide-react";
import { toast } from "sonner";
import { DealsKanban } from "@/components/crm/DealsKanban";
import { DealsList } from "@/components/crm/DealsList";
import { DealsFilters, type DealFilters } from "@/components/crm/DealsFilters";
import { PipelineEditor } from "@/components/crm/PipelineEditor";
import { MonthYearSelect } from "@/components/crm/MonthYearSelect";
import { useAuth, roleAtLeast } from "@/lib/auth";
import { useDeals } from "@/hooks/useDeals";
import { useStages, usePipelines, invalidatePipelines, invalidateStages } from "@/hooks/usePipelines";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useLossReasons, invalidateLossReasons } from "@/hooks/useLossReasons";
import { useActivities } from "@/hooks/useActivities";
import { formatCurrency } from "@/lib/format";
import {
  createDeal, updateDeal, deleteDeal, moveDealToStage, markDealWon, markDealLost,
  createDefaultPipeline, createLossReason, deleteLossReason, enrichDeals, type Deal,
} from "@/lib/data";

type ViewMode = "kanban" | "list";

function currentMonthCloseDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DealsScreen() {
  const { role } = useAuth();
  const canManage = roleAtLeast(role, "manager"); // pipeline é lookup (admin/manager)
  const navigate = useNavigate();

  const { data: dealsRaw, refresh: refreshDeals } = useDeals();
  const { data: stages, refresh: refreshStages } = useStages();
  const { data: pipelines } = usePipelines();
  const { data: contacts } = useContacts();
  const { data: companies } = useCompanies();
  const { data: lossReasons, refresh: refreshLossReasons } = useLossReasons();
  const { data: activities } = useActivities();

  // Cache compartilhada (useDeals) + cruzamento local no front (enrichDeals),
  // espelhado num state próprio para permitir atualização otimista no drag do
  // kanban antes da confirmação do gateway.
  const [deals, setDeals] = useState(() => enrichDeals(dealsRaw, contacts, companies));
  useEffect(() => {
    setDeals(enrichDeals(dealsRaw, contacts, companies));
  }, [dealsRaw, contacts, companies]);

  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  useEffect(() => {
    setSelectedPipeline((prev) => {
      if (prev) return prev;
      const def = pipelines.find((p) => p.is_default) || pipelines[0];
      return def?.id ?? "";
    });
  }, [pipelines]);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldOpenNew = searchParams.get("action") === "new";
  const [form, setForm] = useState<Partial<Deal>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DealFilters>({});

  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossDealId, setLossDealId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [lossNote, setLossNote] = useState("");

  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);

  // Sem SettingsScreen (removida — Épico 08), este é o único lugar da UI onde
  // dá pra criar um pipeline do zero quando não existe nenhum ("Personalizar
  // pipeline" só edita estágios de um pipeline já existente).
  const [firstPipelineName, setFirstPipelineName] = useState("Pipeline de Vendas");
  const [creatingFirstPipeline, setCreatingFirstPipeline] = useState(false);

  const createFirstPipeline = async () => {
    if (!firstPipelineName.trim()) return;
    setCreatingFirstPipeline(true);
    try {
      await createDefaultPipeline(firstPipelineName.trim());
      invalidatePipelines();
      invalidateStages();
      refreshStages();
      toast.success("Pipeline criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar pipeline");
    } finally {
      setCreatingFirstPipeline(false);
    }
  };

  // Motivos de Perda (recuperado da antiga SettingsScreen, removida no Épico
  // 08 — a gestão volta a existir aqui em /deals, junto da lista de negócios
  // perdidos, em vez de uma tela própria) + revisão de negócios "lost" com
  // possibilidade de reverter o status.
  const [lossReasonsSheetOpen, setLossReasonsSheetOpen] = useState(false);
  const [newLossReasonLabel, setNewLossReasonLabel] = useState("");

  const addLossReason = async () => {
    if (!newLossReasonLabel.trim()) return;
    try {
      await createLossReason({ label: newLossReasonLabel.trim() });
      setNewLossReasonLabel("");
      invalidateLossReasons();
      refreshLossReasons();
      toast.success("Motivo de perda criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar motivo");
    }
  };

  const removeLossReason = async (id: string) => {
    await deleteLossReason(id);
    invalidateLossReasons();
    refreshLossReasons();
  };

  const reopenLostDeal = async (dealId: string) => {
    try {
      await updateDeal(dealId, { status: "open" });
      refreshDeals();
      toast.success("Negócio reaberto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reabrir negócio");
    }
  };

  const pipelineStages = useMemo(
    () => stages.filter((s) => s.pipeline_id === selectedPipeline).sort((a, b) => a.sort_order - b.sort_order),
    [stages, selectedPipeline],
  );

  const filteredDeals = deals.filter((d) => {
    if (filters.minValue && (Number(d.value) || 0) < filters.minValue) return false;
    if (filters.maxValue && (Number(d.value) || 0) > filters.maxValue) return false;
    if (filters.closeDateFrom && d.close_date && d.close_date < filters.closeDateFrom) return false;
    if (filters.closeDateTo && d.close_date && d.close_date > filters.closeDateTo) return false;
    if (viewMode === "kanban") {
      const stageIds = pipelineStages.map((s) => s.id);
      if (d.stage_id && !stageIds.includes(d.stage_id) && d.status === "open") return false;
    }
    return true;
  });

  const handleDragEnd = async (dealId: string, newStageId: string) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)));
    await moveDealToStage(dealId, newStageId);
    refreshDeals();
  };

  const openNew = (stageId?: string) => {
    setEditing(null);
    setForm({ title: "", value: 0, currency: "BRL", stage_id: stageId || pipelineStages[0]?.id, status: "open", probability: 0, close_date: currentMonthCloseDate() });
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!shouldOpenNew || pipelineStages.length === 0) return;
    setEditing(null);
    setForm({ title: "", value: 0, currency: "BRL", stage_id: pipelineStages[0]?.id, status: "open", probability: 0, close_date: currentMonthCloseDate() });
    setSheetOpen(true);
    searchParams.delete("action");
    setSearchParams(searchParams, { replace: true });
  }, [shouldOpenNew, pipelineStages, searchParams, setSearchParams]);

  // owner_id NUNCA é enviado — o gateway o seta pela sessão.
  const handleSave = async () => {
    if (!form.title) return;
    try {
      if (editing) {
        await updateDeal(editing.id, {
          title: form.title, value: Number(form.value) || 0, currency: form.currency,
          stage_id: form.stage_id, probability: Number(form.probability) || 0,
          close_date: form.close_date, contact_id: form.contact_id || null, company_id: form.company_id || null,
        });
      } else {
        await createDeal({
          title: form.title, value: Number(form.value) || 0, currency: form.currency || "BRL",
          stage_id: form.stage_id, probability: Number(form.probability) || 0, close_date: form.close_date,
          status: "open", contact_id: form.contact_id || null, company_id: form.company_id || null,
        });
      }
      setSheetOpen(false);
      refreshDeals();
      toast.success(editing ? "Negócio atualizado" : "Negócio criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const onMarkWon = async (dealId: string) => {
    try {
      await markDealWon(dealId);
      refreshDeals();
      toast.success("Negócio marcado como ganho! 🎉");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar como ganho");
    }
  };

  const openLossModal = (dealId: string) => {
    setLossDealId(dealId);
    setLossReason("");
    setLossNote("");
    setLossModalOpen(true);
  };

  const confirmLoss = async () => {
    if (!lossDealId) return;
    try {
      const reason = lossNote ? `${lossReason}: ${lossNote}` : lossReason;
      await markDealLost(lossDealId, reason);
      setLossModalOpen(false);
      refreshDeals();
      toast.success("Negócio marcado como perdido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar como perdido");
    }
  };

  const handleBatchAction = async (action: "won" | "lost" | "delete") => {
    const ids = Array.from(selectedDeals);
    if (action === "delete") {
      await Promise.all(ids.map((id) => deleteDeal(id)));
      toast.success(`${ids.length} negócios excluídos`);
    } else if (action === "won") {
      await Promise.all(ids.map((id) => markDealWon(id)));
      toast.success(`${ids.length} negócios marcados como ganhos`);
    } else {
      await Promise.all(ids.map((id) => markDealLost(id, "")));
      toast.success(`${ids.length} negócios marcados como perdidos`);
    }
    setSelectedDeals(new Set());
    refreshDeals();
  };

  const openDeals = filteredDeals.filter((d) => d.status === "open");
  const wonDeals = filteredDeals.filter((d) => d.status === "won");
  const lostDeals = filteredDeals.filter((d) => d.status === "lost");
  // Todos os perdidos (não só os do filtro/pipeline ativo) — a área de
  // Motivos de Perda é um painel de revisão geral, independente dos filtros
  // do Kanban/Lista.
  const allLostDeals = deals.filter((d) => d.status === "lost");

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Negócios</h1>

          <div className="flex rounded-md border border-border bg-muted/50 p-0.5">
            {[
              { mode: "kanban" as const, icon: Kanban, label: "Kanban" },
              { mode: "list" as const, icon: List, label: "Lista" },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={`Visualização ${label}`}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <Button onClick={() => openNew()} size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Negócio</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredDeals.length} {filteredDeals.length === 1 ? "negócio" : "negócios"}
          </span>

          {pipelines.length > 0 && (
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger className="h-8 w-40 text-xs border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {canManage && (
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={!selectedPipeline} onClick={() => setPipelineDialogOpen(true)} aria-label="Personalizar pipeline">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowFilters(!showFilters)} aria-label="Alternar filtros">
            <Filter className="mr-1 h-3 w-3" /><span className="hidden sm:inline">Filtro</span>
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={() => setLossReasonsSheetOpen(true)}
        className="w-full justify-center gap-2 border-dashed border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
      >
        <XCircle className="h-5 w-5" />
        Motivos de Perda{allLostDeals.length > 0 ? ` · ${allLostDeals.length} negócios perdidos` : ""}
      </Button>

      {showFilters && <DealsFilters filters={filters} onFiltersChange={setFilters} />}

      {pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <KanbanSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum pipeline configurado ainda</p>
          {canManage ? (
            <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
              <Input
                value={firstPipelineName}
                onChange={(e) => setFirstPipelineName(e.target.value)}
                placeholder="Nome do pipeline"
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={createFirstPipeline} disabled={creatingFirstPipeline || !firstPipelineName.trim()}>
                {creatingFirstPipeline ? "Criando..." : "Criar pipeline (5 estágios padrão)"}
              </Button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Peça a um admin/manager para criar o primeiro pipeline.</p>
          )}
        </div>
      ) : (
        <>
          {viewMode === "kanban" && (
            <DealsKanban
              deals={openDeals}
              wonDeals={wonDeals}
              lostDeals={lostDeals}
              stages={pipelineStages}
              activities={activities}
              onDragEnd={handleDragEnd}
              onDealClick={(d) => navigate(`/deals/${d.id}`)}
              onAddDeal={openNew}
              onMarkWon={onMarkWon}
              onMarkLost={openLossModal}
            />
          )}

          {viewMode === "list" && (
            <DealsList
              deals={filteredDeals}
              stages={stages}
              selectedDeals={selectedDeals}
              onSelectionChange={setSelectedDeals}
              onDealClick={(d) => navigate(`/deals/${d.id}`)}
              onBatchAction={handleBatchAction}
            />
          )}
        </>
      )}

      {/* Create/Edit Sheet — sem "Responsável" (owner_id é do gateway) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Negócio" : "Novo Negócio"}</SheetTitle>
            <SheetDescription>{editing ? "Atualize os dados do negócio" : "Preencha os dados do novo negócio"}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome do negócio" />
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Valor</strong>: quanto esse negócio representa em receita.</p>
              <p><strong className="text-foreground">Probabilidade</strong>: chance estimada (%) de fechar, usada para priorizar o funil.</p>
              <p><strong className="text-foreground">Fechamento</strong>: mês/ano em que esse negócio deve fechar (fechamento recorrente).</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={form.currency || "BRL"} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select value={form.stage_id || ""} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Select value={form.contact_id || "none"} onValueChange={(v) => setForm({ ...form, contact_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={form.company_id || "none"} onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Probabilidade (%)</Label>
                <Input type="number" min={0} max={100} value={form.probability ?? ""} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Fechamento</Label>
                <MonthYearSelect value={form.close_date} onChange={(v) => setForm({ ...form, close_date: v })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar Negócio"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Loss Reason Modal — motivos vêm de listLossReasons(), não mais lista fixa (§4.1) */}
      <Dialog open={lossModalOpen} onOpenChange={setLossModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Perda</DialogTitle>
            <DialogDescription>Por que este negócio foi perdido?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                <SelectContent>
                  {lossReasons.filter((lr) => lr.is_active).map((lr) => (
                    <SelectItem key={lr.id} value={lr.label}>{lr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea value={lossNote} onChange={(e) => setLossNote(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmLoss} disabled={!lossReason}>Confirmar Perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Motivos de Perda — gestão de razões + revisão de negócios perdidos.
          Recuperado da antiga SettingsScreen (removida no Épico 08); vive
          aqui em /deals em vez de uma tela própria. */}
      <Sheet open={lossReasonsSheetOpen} onOpenChange={setLossReasonsSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>Motivos de Perda</SheetTitle>
            <SheetDescription>Gerencie os motivos e revise negócios marcados como perdidos.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Razões de Perda</CardTitle>
                <CardDescription className="text-[10px]">
                  Motivos disponíveis ao marcar um negócio como perdido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {canManage && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Preço alto"
                      value={newLossReasonLabel}
                      onChange={(e) => setNewLossReasonLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addLossReason()}
                      className="h-8 text-xs flex-1"
                    />
                    <Button size="sm" className="h-8" onClick={addLossReason}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {lossReasons.map((lr) => (
                    <Badge key={lr.id} variant="secondary" className="text-[10px] gap-1">
                      {lr.label}
                      {canManage && (
                        <button
                          onClick={() => removeLossReason(lr.id)}
                          className="hover:text-destructive"
                          aria-label={`Remover ${lr.label}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {lossReasons.length === 0 && (
                    <p className="py-2 text-xs text-muted-foreground">Nenhum motivo cadastrado</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Negócios Perdidos ({allLostDeals.length})</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {allLostDeals.map((deal) => (
                  <Card key={deal.id} className="border-destructive/20 transition-shadow hover:shadow-md">
                    <CardContent className="space-y-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{deal.title}</p>
                        {deal.company && (
                          <p className="truncate text-xs text-muted-foreground">{deal.company.name}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-destructive">
                        {formatCurrency(Number(deal.value) || 0, deal.currency || "BRL")}
                      </p>
                      {deal.loss_reason && (
                        <p className="truncate text-xs text-muted-foreground">Motivo: {deal.loss_reason}</p>
                      )}
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 flex-1 border-success/30 text-[11px] text-success hover:bg-success/10"
                          onClick={() => onMarkWon(deal.id)}
                        >
                          <Trophy className="mr-1 h-3 w-3" />Ganho
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 flex-1 text-[11px]"
                          onClick={() => reopenLostDeal(deal.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />Reabrir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {allLostDeals.length === 0 && (
                  <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
                    Nenhum negócio perdido no momento
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pipeline Customization Dialog (admin/manager) — componente compartilhado com Configurações (§3.2) */}
      <PipelineEditor
        open={pipelineDialogOpen}
        onOpenChange={setPipelineDialogOpen}
        pipelineId={selectedPipeline}
        stages={stages.filter((s) => s.pipeline_id === selectedPipeline)}
        onSaved={refreshStages}
      />
    </div>
  );
}
