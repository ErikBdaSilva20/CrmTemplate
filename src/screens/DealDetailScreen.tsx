import { DealQualification } from '@/components/crm/DealQualification';
import { LossReasonModal } from '@/components/crm/deals/LossReasonModal';
import { DealActivityTimeline } from '@/components/crm/dealDetail/DealActivityTimeline';
import { DealCompanyCard } from '@/components/crm/dealDetail/DealCompanyCard';
import { DealContactCard } from '@/components/crm/dealDetail/DealContactCard';
import { DealDetailHeader } from '@/components/crm/dealDetail/DealDetailHeader';
import { DealDetailsCard } from '@/components/crm/dealDetail/DealDetailsCard';
import { invalidateActivities } from '@/hooks/useActivities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useDeals } from '@/hooks/useDeals';
import { useStages } from '@/hooks/usePipelines';
import {
  createActivity,
  listActivitiesByDeal,
  markDealWon,
  updateDeal,
  type Activity,
  type ActivityType,
} from '@/lib/data';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

// Orquestrador: busca/deriva os dados (deal, contato, empresa, estágios,
// atividades) e delega toda a renderização visual para
// components/crm/dealDetail/** (Masia Clone-Template Audit Framework
// §4/§6.1 — "God Component" split, ver Auditoria Geral 2026-07-07 §5).
export default function DealDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Sem get-by-id no modo genérico (§B5): o deal vem da mesma coleção
  // cacheada usada por DealsScreen/Dashboard, e contato/empresa/estágios são
  // resolvidos direto dos caches — sem waterfall de requisições sequenciais
  // (AUDITORIA-CODIGO.md §1.2: antes eram 3 buscas encadeadas em série).
  const { data: deals, loading: dealsLoading, refresh: refreshDeals } = useDeals();
  const { data: stages } = useStages();
  const { data: contacts } = useContacts();
  const { data: companies } = useCompanies();

  const dealFromCache = useMemo(() => deals.find((d) => d.id === id) ?? null, [deals, id]);
  const [deal, setDeal] = useState(dealFromCache);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossForm, setLossForm] = useState({ reason: '' });
  const [statusActionPending, setStatusActionPending] = useState(false);

  useEffect(() => {
    if (dealsLoading) return;
    if (!dealFromCache) {
      navigate('/deals');
      return;
    }
    setDeal(dealFromCache);
  }, [dealFromCache, dealsLoading, navigate]);

  const fetchActivities = useCallback(async () => {
    if (!id) return;
    const acts = await listActivitiesByDeal(id);
    setActivities([...acts].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')));
  }, [id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (!deal) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const contact = deal.contact_id ? (contacts.find((c) => c.id === deal.contact_id) ?? null) : null;
  const company = deal.company_id
    ? (companies.find((c) => c.id === deal.company_id) ?? null)
    : null;

  const lastActivity = activities[0];
  const daysSinceActivity =
    lastActivity && lastActivity.created_at
      ? Math.floor(
          (Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;
  const healthColor =
    daysSinceActivity <= 3
      ? 'bg-success'
      : daysSinceActivity <= 7
        ? 'bg-warning'
        : 'bg-destructive';
  const healthLabel =
    daysSinceActivity <= 3 ? 'Saudável' : daysSinceActivity <= 7 ? 'Atenção' : 'Inativo';

  const currentStage = stages.find((s) => s.id === deal.stage_id);
  const orderedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const currentStageIndex = orderedStages.findIndex((s) => s.id === deal.stage_id);

  const saveTitle = async (title: string) => {
    await updateDeal(deal.id, { title });
    setDeal({ ...deal, title });
    refreshDeals();
    toast.success('Título atualizado');
  };

  const saveValue = async (value: number, currency: string) => {
    await updateDeal(deal.id, { value, currency });
    setDeal({ ...deal, value, currency });
    refreshDeals();
    toast.success('Valor atualizado');
  };

  const changeStage = async (stageId: string) => {
    await updateDeal(deal.id, { stage_id: stageId });
    setDeal({ ...deal, stage_id: stageId });
    refreshDeals();
    toast.success('Estágio atualizado');
  };

  const markAsWon = async () => {
    if (statusActionPending) return;
    setStatusActionPending(true);
    try {
      await markDealWon(deal.id);
      setDeal({ ...deal, status: 'won', loss_reason: null });
      refreshDeals();
      toast.success('Negócio marcado como ganho! 🎉');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar como ganho');
    } finally {
      setStatusActionPending(false);
    }
  };

  const confirmLoss = async () => {
    if (statusActionPending) return;
    setStatusActionPending(true);
    try {
      await updateDeal(deal.id, { status: 'lost', loss_reason: lossForm.reason.trim() });
      setDeal({ ...deal, status: 'lost', loss_reason: lossForm.reason.trim() });
      setLossModalOpen(false);
      refreshDeals();
      toast.success('Negócio marcado como perdido');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar como perdido');
    } finally {
      setStatusActionPending(false);
    }
  };

  const openLossModal = () => {
    setLossForm({ reason: '' });
    setLossModalOpen(true);
  };

  const reopenDeal = async () => {
    if (statusActionPending) return;
    setStatusActionPending(true);
    try {
      await updateDeal(deal.id, { status: 'open' });
      setDeal({ ...deal, status: 'open' });
      refreshDeals();
      toast.success('Negócio reaberto');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reabrir negócio');
    } finally {
      setStatusActionPending(false);
    }
  };

  // owner_id setado pelo gateway — não enviar.
  const addActivity = async (activity: { type: ActivityType; title: string; body: string }) => {
    await createActivity({
      deal_id: deal.id,
      type: activity.type,
      title: activity.title,
      body: activity.body || null,
    });
    fetchActivities();
    invalidateActivities();
    toast.success('Atividade adicionada');
  };

  return (
    <div className="space-y-6">
      <DealDetailHeader
        deal={deal}
        currentStage={currentStage}
        orderedStages={orderedStages}
        currentStageIndex={currentStageIndex}
        healthColor={healthColor}
        healthLabel={healthLabel}
        statusActionPending={statusActionPending}
        onBack={() => navigate('/deals')}
        onSaveTitle={saveTitle}
        onSaveValue={saveValue}
        onChangeStage={changeStage}
        onMarkWon={markAsWon}
        onOpenLossModal={openLossModal}
        onReopenDeal={reopenDeal}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DealActivityTimeline activities={activities} onAdd={addActivity} />

        <div className="space-y-4">
          <DealQualification
            dealId={deal.id}
            qualification={deal.qualification}
            qualificationScore={deal.qualification_score || 0}
            isLateStage={currentStageIndex >= Math.max(0, orderedStages.length - 2)}
            onUpdate={refreshDeals}
          />
          <DealContactCard contact={contact} />
          <DealCompanyCard company={company} />
          <DealDetailsCard deal={deal} />
        </div>
      </div>

      <LossReasonModal
        open={lossModalOpen}
        onOpenChange={setLossModalOpen}
        form={lossForm}
        onFormChange={(patch) => setLossForm((prev) => ({ ...prev, ...patch }))}
        onConfirm={confirmLoss}
      />
    </div>
  );
}
