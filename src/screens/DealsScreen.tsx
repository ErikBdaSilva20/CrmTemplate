import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Kanban, List, TrendingUp, Plus, Filter, Settings2, Trash2, Loader2, Bookmark, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DealsKanban } from "@/components/crm/DealsKanban";
import { DealsList } from "@/components/crm/DealsList";
import { DealsForecast } from "@/components/crm/DealsForecast";
import { DealsFilters, type DealFilters } from "@/components/crm/DealsFilters";
import { useAuth, roleAtLeast } from "@/lib/auth";
import {
  listDeals, createDeal, updateDeal, deleteDeal, moveDealToStage, markDealWon, markDealLost,
  enrichDeals, type Deal, type DealWithRelations,
  listContacts, type Contact,
  listCompanies, type Company,
  listPipelines, type Pipeline,
  listStages, createStage, updateStage, deleteStage, type PipelineStage,
  listSegments, type Segment,
} from "@/lib/data";

type ViewMode = "kanban" | "list" | "forecast";

export default function DealsScreen() {
  const { role } = useAuth();
  const canManage = roleAtLeast(role, "manager"); // pipeline é lookup (admin/manager)
  const navigate = useNavigate();

  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldOpenNew = searchParams.get("action") === "new";
  const [form, setForm] = useState<Partial<Deal>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DealFilters>({});
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossDealId, setLossDealId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [lossNote, setLossNote] = useState("");

  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());

  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [editingStages, setEditingStages] = useState<{ id?: string; name: string; color: string; win_probability: number; sort_order: number }[]>([]);
  const [savingPipeline, setSavingPipeline] = useState(false);

  const openPipelineEditor = () => {
    const current = stages
      .filter((s) => s.pipeline_id === selectedPipeline)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ id: s.id, name: s.name, color: s.color || "#94a3b8", win_probability: Number(s.win_probability) || 0, sort_order: s.sort_order }));
    setEditingStages(current.length > 0 ? current : [{ name: "", color: "#94a3b8", win_probability: 50, sort_order: 0 }]);
    setPipelineDialogOpen(true);
  };

  const addEditStage = () =>
    setEditingStages([...editingStages, { name: "", color: "#94a3b8", win_probability: 50, sort_order: editingStages.length }]);
  const removeEditStage = (idx: number) => setEditingStages(editingStages.filter((_, i) => i !== idx));
  const updateEditStage = (idx: number, field: string, value: unknown) =>
    setEditingStages(editingStages.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const savePipelineStages = async () => {
    if (!selectedPipeline) return;
    setSavingPipeline(true);

    const existingIds = editingStages.filter((s) => s.id).map((s) => s.id!);
    const currentStageIds = stages.filter((s) => s.pipeline_id === selectedPipeline).map((s) => s.id);
    const toDelete = currentStageIds.filter((id) => !existingIds.includes(id));
    await Promise.all(toDelete.map((id) => deleteStage(id)));

    for (let i = 0; i < editingStages.length; i++) {
      const s = editingStages[i];
      const payload = { name: s.name, color: s.color, win_probability: s.win_probability, sort_order: i, pipeline_id: selectedPipeline };
      if (s.id) await updateStage(s.id, payload);
      else await createStage(payload);
    }

    setSavingPipeline(false);
    setPipelineDialogOpen(false);
    toast.success("Pipeline atualizado!");
    fetchData();
  };

  // Carrega tudo em paralelo e cruza no front (sem join, sem org_id, sem realtime).
  const fetchData = useCallback(async () => {
    const [dealsRaw, stagesAll, pipelinesAll, contactsAll, companiesAll, segsAll] = await Promise.all([
      listDeals(), listStages(), listPipelines(), listContacts(), listCompanies(), listSegments(),
    ]);
    setStages(stagesAll);
    setPipelines(pipelinesAll);
    setContacts(contactsAll);
    setCompanies(companiesAll);
    setDeals(enrichDeals(dealsRaw, contactsAll, companiesAll));
    setSegments(segsAll.filter((s) => (s.filters as Record<string, unknown>)?.entity === "deals"));
    setSelectedPipeline((prev) => {
      if (prev) return prev;
      const def = pipelinesAll.find((p) => p.is_default) || pipelinesAll[0];
      return def?.id ?? "";
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applySegment = (seg: Segment) => {
    const f = seg.filters as Record<string, unknown>;
    setFilters({
      minValue: f?.min_value != null ? Number(f.min_value) : undefined,
      maxValue: f?.max_value != null ? Number(f.max_value) : undefined,
    });
    setActiveSegmentId(seg.id);
  };

  const clearSegment = () => {
    setActiveSegmentId(null);
    setFilters({});
  };

  const pipelineStages = stages
    .filter((s) => s.pipeline_id === selectedPipeline)
    .sort((a, b) => a.sort_order - b.sort_order);

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
  };

  const openNew = (stageId?: string) => {
    setEditing(null);
    setForm({ title: "", value: 0, currency: "BRL", stage_id: stageId || pipelineStages[0]?.id, status: "open", probability: 0 });
    setSheetOpen(true);
  };

  useEffect(() => {
    if (shouldOpenNew && pipelineStages.length > 0) {
      openNew();
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenNew, pipelineStages]);

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm(deal);
    setSheetOpen(true);
  };
  void openEdit; // disponível para telas/handlers que editem via Sheet

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
      fetchData();
      toast.success(editing ? "Negócio atualizado" : "Negócio criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const onMarkWon = async (dealId: string) => {
    await markDealWon(dealId);
    fetchData();
    toast.success("Negócio marcado como ganho! 🎉");
  };

  const openLossModal = (dealId: string) => {
    setLossDealId(dealId);
    setLossReason("");
    setLossNote("");
    setLossModalOpen(true);
  };

  const confirmLoss = async () => {
    if (!lossDealId) return;
    const reason = lossNote ? `${lossReason}: ${lossNote}` : lossReason;
    await markDealLost(lossDealId, reason);
    setLossModalOpen(false);
    fetchData();
    toast.success("Negócio marcado como perdido");
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
    fetchData();
  };

  const openDeals = filteredDeals.filter((d) => d.status === "open");
  const wonDeals = filteredDeals.filter((d) => d.status === "won");
  const lostDeals = filteredDeals.filter((d) => d.status === "lost");

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Negócios</h1>

          <div className="flex rounded-md border border-border bg-muted/50 p-0.5">
            {[
              { mode: "kanban" as const, icon: Kanban, label: "Kanban" },
              { mode: "list" as const, icon: List, label: "Lista" },
              { mode: "forecast" as const, icon: TrendingUp, label: "Previsão" },
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
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={openPipelineEditor} aria-label="Personalizar pipeline">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowFilters(!showFilters)} aria-label="Alternar filtros">
            <Filter className="mr-1 h-3 w-3" /><span className="hidden sm:inline">Filtro</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={activeSegmentId ? "secondary" : "outline"} size="sm" className="h-8" aria-label="Filtros salvos">
                <Bookmark className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">
                  {activeSegmentId ? (segments.find((s) => s.id === activeSegmentId)?.name ?? "Segmentos") : "Segmentos"}
                </span>
                {activeSegmentId && (
                  <X className="ml-1 h-3 w-3 hover:text-destructive" onClick={(e) => { e.stopPropagation(); clearSegment(); }} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {segments.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum filtro salvo</DropdownMenuItem>
              ) : segments.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => applySegment(s)} className={`text-xs ${activeSegmentId === s.id ? "font-medium" : ""}`}>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showFilters && <DealsFilters filters={filters} onFiltersChange={setFilters} />}

      {viewMode === "kanban" && (
        <DealsKanban
          deals={openDeals}
          wonDeals={wonDeals}
          lostDeals={lostDeals}
          stages={pipelineStages}
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

      {viewMode === "forecast" && <DealsForecast deals={openDeals} stages={pipelineStages} />}

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
                <Input type="date" value={form.close_date || ""} onChange={(e) => setForm({ ...form, close_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar Negócio"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Loss Reason Modal */}
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
                  <SelectItem value="Preço">Preço muito alto</SelectItem>
                  <SelectItem value="Concorrência">Perdeu para concorrência</SelectItem>
                  <SelectItem value="Timing">Timing inadequado</SelectItem>
                  <SelectItem value="Budget">Sem orçamento</SelectItem>
                  <SelectItem value="Fit">Produto não atende</SelectItem>
                  <SelectItem value="Sem resposta">Sem resposta do cliente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
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

      {/* Pipeline Customization Dialog (admin/manager) */}
      <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personalizar Pipeline</DialogTitle>
            <DialogDescription>Edite os estágios do seu pipeline de vendas</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {editingStages.map((stage, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => updateEditStage(idx, "color", e.target.value)}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border-0"
                  aria-label={`Cor do estágio ${idx + 1}`}
                />
                <Input
                  value={stage.name}
                  onChange={(e) => updateEditStage(idx, "name", e.target.value)}
                  placeholder={`Estágio ${idx + 1}`}
                  className="min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <Input
                    type="number" min={0} max={100}
                    value={stage.win_probability}
                    onChange={(e) => updateEditStage(idx, "win_probability", Number(e.target.value))}
                    className="w-14 text-center text-xs"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                {editingStages.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEditStage(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addEditStage}>
              <Plus className="mr-1 h-3.5 w-3.5" />Adicionar estágio
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePipelineStages} disabled={savingPipeline || editingStages.some((s) => !s.name.trim())}>
              {savingPipeline && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
