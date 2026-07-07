import { CollapsibleStatusColumn } from '@/components/crm/dealsKanban/CollapsibleStatusColumn';
import { StageColumn } from '@/components/crm/dealsKanban/StageColumn';
import { WonLostDropZone } from '@/components/crm/dealsKanban/WonLostDropZone';
import { buildDealPriorityMap } from '@/lib/analytics';
import type { Activity, DealWithRelations, PipelineStage } from '@/lib/data';
import { formatCurrency } from '@/lib/format';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Trophy, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

// Orquestrador: busca/agrupa os dados (prioridade, stage) e delega toda a
// renderização visual para components/crm/dealsKanban/** (Masia
// Clone-Template Audit Framework §4/§6.1 — "God Component" split, ver
// Auditoria Geral 2026-07-07 §5).
interface DealsKanbanProps {
  deals: DealWithRelations[];
  wonDeals: DealWithRelations[];
  lostDeals: DealWithRelations[];
  stages: PipelineStage[];
  activities: Activity[];
  onDragEnd: (dealId: string, newStageId: string) => void;
  onDealClick: (deal: DealWithRelations) => void;
  onAddDeal: (stageId?: string) => void;
  onMarkWon: (dealId: string) => void;
  onMarkLost: (dealId: string) => void;
}

export function DealsKanban({
  deals,
  wonDeals,
  lostDeals,
  stages,
  activities,
  onDragEnd,
  onDealClick,
  onAddDeal,
  onMarkWon,
  onMarkLost,
}: DealsKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<DealWithRelations | null>(null);

  // Uma passada O(deals + activities) pra alimentar sort e cards, em vez de
  // recalcular dealPriority por deal dentro do comparator e de novo no card.
  const priorityByDealId = useMemo(() => buildDealPriorityMap(deals, activities), [deals, activities]);

  // Agrupa deals por stage uma vez (O(deals)), em vez de um deals.filter()
  // por coluna dentro do map de stages (O(stages × deals)).
  const dealsByStageId = useMemo(() => {
    const map = new Map<string | null, DealWithRelations[]>();
    for (const deal of deals) {
      const bucket = map.get(deal.stage_id);
      if (bucket) bucket.push(deal);
      else map.set(deal.stage_id, [deal]);
    }
    return map;
  }, [deals]);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDeal(deals.find((d) => d.id === event.active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id as string;
    const overId = over.id as string;
    if (overId === 'won-drop') onMarkWon(dealId);
    else if (overId === 'lost-drop') onMarkLost(dealId);
    else if (dealId !== overId) onDragEnd(dealId, overId);
  };

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-20">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhum dado encontrado</p>
          <p className="text-sm text-muted-foreground">
            Clique no botão acima pra criar o primeiro negócio
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-w-[70vw] gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStageId.get(stage.id) ?? []}
              stages={stages}
              priorityByDealId={priorityByDealId}
              onDealClick={onDealClick}
              onAddDeal={onAddDeal}
              onMoveDeal={onDragEnd}
            />
          ))}
        </div>

        {/* Floating Drop Zones (visíveis apenas durante o drag) */}
        <div
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-4 transition-all duration-300 ${
            activeDeal
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : 'translate-y-10 opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-3 shadow-2xl backdrop-blur-xl">
            <WonLostDropZone
              id="won-drop"
              label="Ganho"
              icon={Trophy}
              color="text-success"
              className="h-28 w-36 sm:w-48"
            />
            <WonLostDropZone
              id="lost-drop"
              label="Perdido"
              icon={XCircle}
              color="text-destructive"
              className="h-28 w-36 sm:w-48"
            />
          </div>
        </div>

        <DragOverlay>
          {activeDeal && (
            <div className="w-[220px] opacity-90">
              <div className="rounded-md border border-primary bg-card p-2.5 shadow-lg">
                <p className="text-[13px] font-medium">{activeDeal.title}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  {formatCurrency(activeDeal.value, activeDeal.currency || 'BRL')}
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {(wonDeals.length > 0 || lostDeals.length > 0) && (
        <div className="space-y-2">
          <CollapsibleStatusColumn
            title="Ganhos"
            icon={Trophy}
            deals={wonDeals}
            color="text-success"
            onDealClick={onDealClick}
          />
          <CollapsibleStatusColumn
            title="Perdidos"
            icon={XCircle}
            deals={lostDeals}
            color="text-destructive"
            onDealClick={onDealClick}
          />
        </div>
      )}
    </div>
  );
}
