import { DealCard } from '@/components/crm/dealsKanban/DealCard';
import type { DealPriority, DealPriorityLevel } from '@/lib/analytics';
import type { DealWithRelations, PipelineStage } from '@/lib/data';
import { formatCurrency } from '@/lib/format';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

const PRIORITY_RANK: Record<DealPriorityLevel, number> = { urgent: 0, risk: 1, stale: 2, none: 3 };

// Deals que precisam de atenção sobem para o topo da coluna, sem embaralhar a
// ordem relativa dentro do mesmo nível de prioridade. Recebe o Map já
// computado (buildDealPriorityMap) em vez de recalcular prioridade por deal.
function sortByPriority(
  deals: DealWithRelations[],
  priorityByDealId: Map<string, DealPriority>,
): DealWithRelations[] {
  return [...deals].sort(
    (a, b) =>
      PRIORITY_RANK[priorityByDealId.get(a.id)?.level ?? 'none'] -
      PRIORITY_RANK[priorityByDealId.get(b.id)?.level ?? 'none']
  );
}

export function StageColumn({
  stage,
  deals,
  stages,
  priorityByDealId,
  onDealClick,
  onAddDeal,
  onMoveDeal,
}: {
  stage: PipelineStage;
  deals: DealWithRelations[];
  stages: PipelineStage[];
  priorityByDealId: Map<string, DealPriority>;
  onDealClick: (d: DealWithRelations) => void;
  onAddDeal: (stageId: string) => void;
  onMoveDeal: (dealId: string, stageId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((s, d) => s + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-1 min-w-[220px] sm:min-w-[240px] flex-col transition-colors ${isOver ? 'bg-primary/5' : ''}`}
    >
      <div className="mb-1 px-1">
        <h3 className="text-[13px] font-bold text-foreground leading-tight">{stage.name}</h3>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground font-medium">
            {formatCurrency(total)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {deals.length} {deals.length === 1 ? 'negócio' : 'negócios'}
          </span>
        </div>
      </div>

      <div
        className="h-1 w-full rounded-full mb-2"
        style={{ backgroundColor: stage.color || 'hsl(var(--primary))' }}
      />

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-240px)] pr-0.5">
        {sortByPriority(deals, priorityByDealId).map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            stages={stages}
            priority={priorityByDealId.get(deal.id) ?? { level: 'none', reasons: [] }}
            onClick={() => onDealClick(deal)}
            onMoveStage={(stageId) => onMoveDeal(deal.id, stageId)}
          />
        ))}
        <button
          onClick={() => onAddDeal(stage.id)}
          className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>
    </div>
  );
}
