import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanSquare, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DealsKanban } from "@/components/crm/DealsKanban";
import { DealsList } from "@/components/crm/DealsList";
import { DealsFilters, type DealFilters } from "@/components/crm/DealsFilters";
import { PipelineEditor } from "@/components/crm/PipelineEditor";
import { DealsToolbar, type DealsViewMode } from "@/components/crm/deals/DealsToolbar";
import { DealFormSheet } from "@/components/crm/deals/DealFormSheet";
import { LossReasonModal } from "@/components/crm/deals/LossReasonModal";
import { LossReasonsPanel } from "@/components/crm/deals/LossReasonsPanel";
import { useAuth, roleAtLeast } from "@/lib/auth";
import { useDeals } from "@/hooks/useDeals";
import { useStages, usePipelines, invalidatePipelines, invalidateStages } from "@/hooks/usePipelines";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useLossReasons, invalidateLossReasons } from "@/hooks/useLossReasons";
import { useActivities } from "@/hooks/useActivities";
import {
  createDeal, updateDeal, deleteDeal, moveDealToStage, markDealWon, markDealLost,
  createDefaultPipeline, createLossReason, deleteLossReason, enrichDeals, type Deal,
} from "@/lib/data";

function currentMonthCloseDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// Orquestrador de layout: busca os dados, mantém o estado dos painéis
// (sheet de negócio, modal/sheet de motivos de perda, filtros) e delega a
// renderização visual para components/crm/deals/** e components/crm/**
// (Masia Clone-Template Audit Framework §4/§6.1).
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

  const [viewMode, setViewMode] = useState<DealsViewMode>("kanban");
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
    if (filters.minValue && d.value < filters.minValue) return false;
    if (filters.maxValue && d.value > filters.maxValue) return false;
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
      <DealsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewDeal={() => openNew()}
        filteredCount={filteredDeals.length}
        pipelines={pipelines}
        selectedPipeline={selectedPipeline}
        onPipelineChange={setSelectedPipeline}
        canManage={canManage}
        onOpenPipelineEditor={() => setPipelineDialogOpen(true)}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

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

      <DealFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        form={form}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        pipelineStages={pipelineStages}
        contacts={contacts}
        companies={companies}
        onSave={handleSave}
      />

      <LossReasonModal
        open={lossModalOpen}
        onOpenChange={setLossModalOpen}
        lossReasons={lossReasons}
        lossReason={lossReason}
        onLossReasonChange={setLossReason}
        lossNote={lossNote}
        onLossNoteChange={setLossNote}
        onConfirm={confirmLoss}
      />

      <LossReasonsPanel
        open={lossReasonsSheetOpen}
        onOpenChange={setLossReasonsSheetOpen}
        lossReasons={lossReasons}
        canManage={canManage}
        newLossReasonLabel={newLossReasonLabel}
        onNewLossReasonLabelChange={setNewLossReasonLabel}
        onAddLossReason={addLossReason}
        onRemoveLossReason={removeLossReason}
        allLostDeals={allLostDeals}
        onMarkWon={onMarkWon}
        onReopen={reopenLostDeal}
      />

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
