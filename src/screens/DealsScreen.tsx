import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Kanban, List, Plus, Filter, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { DealsKanban } from "@/components/crm/DealsKanban";
import { DealsList } from "@/components/crm/DealsList";
import { DealsFilters, type DealFilters } from "@/components/crm/DealsFilters";
import { PipelineEditor } from "@/components/crm/PipelineEditor";
import { MonthYearSelect } from "@/components/crm/MonthYearSelect";
import { useAuth, roleAtLeast } from "@/lib/auth";
import { useDeals } from "@/hooks/useDeals";
import { useStages, usePipelines } from "@/hooks/usePipelines";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useLossReasons } from "@/hooks/useLossReasons";
import {
  createDeal, updateDeal, deleteDeal, moveDealToStage, markDealWon, markDealLost,
  enrichDeals, type Deal,
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
  const { data: lossReasons } = useLossReasons();

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
    await markDealWon(dealId);
    refreshDeals();
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
    refreshDeals();
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
    refreshDeals();
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
