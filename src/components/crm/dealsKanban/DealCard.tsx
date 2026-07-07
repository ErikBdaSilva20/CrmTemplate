import { BantBadge } from '@/components/crm/BantBadge';
import type { DealPriority, DealPriorityLevel } from '@/lib/analytics';
import type { DealWithRelations, PipelineStage } from '@/lib/data';
import { DEAL_STATUS } from '@/lib/domain';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDraggable } from '@dnd-kit/core';
import { AlertTriangle, CalendarDays, ChevronRight, Clock, GripVertical } from 'lucide-react';

export const PRIORITY_STYLES: Record<
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

export function DealCard({
  deal,
  stages,
  priority,
  onClick,
  onMoveStage,
}: {
  deal: DealWithRelations;
  stages: PipelineStage[];
  priority: DealPriority;
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
          <div className="mt-1.5">
            <BantBadge score={deal.qualification_score} />
          </div>
        </div>
      </div>
    </div>
  );
}
