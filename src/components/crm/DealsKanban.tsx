import { QualificationBar } from '@/components/crm/QualificationBar';
import { dealPriority, type DealPriorityLevel } from '@/lib/analytics';
import type { Activity, DealWithRelations, PipelineStage } from '@/lib/data';
import { DEAL_STATUS } from '@/lib/domain';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  GripVertical,
  Plus,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

const PRIORITY_STYLES: Record<
  DealPriorityLevel,
  { border: string; badge: string; icon: typeof AlertTriangle; label: string } | null
> = {
  urgent: {
    border: 'border-destructive/50',
    badge: 'bg-destructive/10 text-destructive',
    icon: AlertTriangle,
    label: 'Urgente',
  },
  risk: {
    border: 'border-warning/50',
    badge: 'bg-warning/10 text-warning',
    icon: AlertTriangle,
    label: 'Risco',
  },
  stale: {
    border: 'border-muted-foreground/30',
    badge: 'bg-muted text-muted-foreground',
    icon: Clock,
    label: 'Parado',
  },
  none: null,
};

const PRIORITY_RANK: Record<DealPriorityLevel, number> = { urgent: 0, risk: 1, stale: 2, none: 3 };

// Deals que precisam de atenção sobem para o topo da coluna, sem embaralhar a
// ordem relativa dentro do mesmo nível de prioridade.
function sortByPriority(deals: DealWithRelations[], activities: Activity[]): DealWithRelations[] {
  return [...deals].sort(
    (a, b) =>
      PRIORITY_RANK[dealPriority(a, activities).level] -
      PRIORITY_RANK[dealPriority(b, activities).level]
  );
}

type Stage = PipelineStage;

/* ── Deal Card ───────────────────────────────────────────── */

function DealCard({
  deal,
  stages,
  activities,
  onClick,
  onMoveStage,
}: {
  deal: DealWithRelations;
  stages: Stage[];
  activities: Activity[];
  onClick: () => void;
  onMoveStage: (stageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  const subtitleParts: string[] = [];
  if (deal.company) subtitleParts.push(deal.company.name);
  if (deal.contact)
    subtitleParts.push(`${deal.contact.first_name} ${deal.contact.last_name || ''}`.trim());
  const subtitle = subtitleParts.join(', ');

  const orderedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const currentIdx = orderedStages.findIndex((s) => s.id === deal.stage_id);
  const nextStage = orderedStages[currentIdx + 1];

  const priority = dealPriority(deal, activities);
  const priorityStyle = PRIORITY_STYLES[priority.level];

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      <div
        className={`flex items-stretch rounded-md border bg-card transition-all hover:shadow-md ${priorityStyle?.border || 'border-border'}`}
      >
        {/* Drag handle — touch-none só aqui, não bloqueia o clique no card */}
        <button
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center px-1.5 text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing touch-none"
          aria-label="Arrastar"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Card body — clicável para abrir detalhe */}
        <div className="flex-1 min-w-0 cursor-pointer p-2 pr-2.5" onClick={onClick}>
          <p className="truncate text-[13px] font-medium leading-snug text-foreground">
            {deal.title}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground leading-tight">
              {subtitle}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={`rounded px-1 py-0.5 text-[9px] font-medium ${DEAL_STATUS[deal.status].badgeClassName}`}
            >
              {DEAL_STATUS[deal.status].label}
            </span>
            {deal.close_date && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <CalendarDays className="h-2.5 w-2.5" />
                {formatDate(deal.close_date)}
              </span>
            )}
            {priorityStyle && (
              <span
                className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium ${priorityStyle.badge}`}
              >
                <priorityStyle.icon className="h-2.5 w-2.5" />
                {priorityStyle.label}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <svg
                className="h-3 w-3 shrink-0 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {formatCurrency(deal.value, deal.currency || 'BRL')}
            </span>

            {/* Botão de avanço de estágio — visível só no mobile */}
            {nextStage && (
              <button
                className="flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveStage(nextStage.id);
                }}
                aria-label={`Mover para ${nextStage.name}`}
              >
                <span className="max-w-[60px] truncate">{nextStage.name}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {(deal.qualification_score ?? 0) > 0 && (
            <div className="mt-1.5">
              <QualificationBar score={deal.qualification_score} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Stage Column ────────────────────────────────────────── */

function StageColumn({
  stage,
  deals,
  stages,
  activities,
  onDealClick,
  onAddDeal,
  onMoveDeal,
}: {
  stage: Stage;
  deals: DealWithRelations[];
  stages: Stage[];
  activities: Activity[];
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
        {sortByPriority(deals, activities).map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            stages={stages}
            activities={activities}
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

/* ── Collapsible Won/Lost ────────────────────────────────── */

function CollapsibleStatusColumn({
  title,
  icon: Icon,
  deals,
  color,
  onDealClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  deals: DealWithRelations[];
  color: string;
  onDealClick: (d: DealWithRelations) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const total = deals.reduce((s, d) => s + d.value, 0);
  if (deals.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-muted/20">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-semibold">{title}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatCurrency(total)}</span>
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {!collapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 p-2 border-t border-border">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="cursor-pointer rounded-md border border-border bg-card p-2 hover:shadow-sm transition-shadow"
              onClick={() => onDealClick(deal)}
            >
              <p className="truncate text-[13px] font-medium">{deal.title}</p>
              {deal.company && (
                <p className="truncate text-[11px] text-muted-foreground">{deal.company.name}</p>
              )}
              <p className={`text-xs font-semibold mt-0.5 ${color}`}>
                {formatCurrency(deal.value, deal.currency || 'BRL')}
              </p>
              {deal.qualification_score > 0 && (
                <div className="mt-1">
                  <QualificationBar score={deal.qualification_score} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Won/Lost Drop Zones ─────────────────────────────────── */

function WonLostDropZone({
  id,
  label,
  icon: Icon,
  color,
  className = '',
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
        isOver
          ? 'border-primary bg-primary/10 scale-[1.02] shadow-md'
          : 'border-muted-foreground/30 bg-background/80 backdrop-blur-sm hover:border-primary/50'
      } ${className}`}
    >
      <Icon className={`h-8 w-8 ${color} mb-1`} />
      <span className={`text-[13px] font-bold ${color}`}>{label}</span>
    </div>
  );
}

/* ── Main Kanban ─────────────────────────────────────────── */

interface DealsKanbanProps {
  deals: DealWithRelations[];
  wonDeals: DealWithRelations[];
  lostDeals: DealWithRelations[];
  stages: Stage[];
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
              deals={deals.filter((d) => d.stage_id === stage.id)}
              stages={stages}
              activities={activities}
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
