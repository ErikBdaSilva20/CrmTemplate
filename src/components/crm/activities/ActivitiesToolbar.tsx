import { Button } from "@/components/ui/button";
import { CalendarDays, List, Plus } from "lucide-react";
import { ACTIVITY_TYPE, ACTIVITY_TYPES } from "@/lib/domain";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { BucketTabs } from "@/components/crm/BucketTabs";
import { PeriodSelect } from "@/components/crm/PeriodSelect";
import type { OperationalBucket } from "@/lib/activityBuckets";
import type { Period } from "@/lib/period";

export type ViewMode = "list" | "calendar";
export type DateFilter = Exclude<OperationalBucket, "done">;

const BUCKETS: { key: DateFilter; label: string }[] = [
  { key: "todo", label: "Para fazer" },
  { key: "overdue", label: "Vencido" },
  { key: "today", label: "Hoje" },
  { key: "tomorrow", label: "Amanhã" },
  { key: "this_week", label: "Esta semana" },
  { key: "next_week", label: "Próxima semana" },
  { key: "next_30_days", label: "Próximos 30 dias" },
];

interface ActivitiesToolbarProps {
  totalCount: number;
  overdueCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateClick: () => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  dateCounts: Record<DateFilter, number>;
  // Período analítico (FR-16) — distinto do Bucket acima: Bucket filtra por
  // due_date (operacional, "o que fazer agora"), Período filtra por
  // created_at (analítico, "como foi o intervalo X"). Ver ActivitiesScreen.tsx.
  period: Period;
  onPeriodChange: (period: Period) => void;
}

// Cabeçalho + as duas linhas de filtro (tipo, vencimento) da tela de
// Atividades — vivem juntos porque só existem em função um do outro (mudar
// tipo/vencimento é a única coisa que este bloco faz) e nunca são
// reaproveitados isoladamente.
export function ActivitiesToolbar({
  totalCount,
  overdueCount,
  viewMode,
  onViewModeChange,
  onCreateClick,
  typeFilter,
  onTypeFilterChange,
  dateFilter,
  onDateFilterChange,
  dateCounts,
  period,
  onPeriodChange,
}: ActivitiesToolbarProps) {
  return (
    <>
      <div className="flex items-center justify-between pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} atividades
            {overdueCount > 0 && (
              <span className="text-destructive font-medium ml-1">· {overdueCount} atrasadas</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedToggle
            options={[
              { value: "list", icon: List, ariaLabel: "Lista" },
              { value: "calendar", icon: CalendarDays, ariaLabel: "Calendário" },
            ]}
            value={viewMode}
            onChange={onViewModeChange}
          />
          <Button onClick={onCreateClick} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Atividade
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 pb-2 border-b border-border flex-wrap">
        <button
          onClick={() => onTypeFilterChange("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          Tudo
        </button>
        {ACTIVITY_TYPES.map((t) => {
          const Icon = ACTIVITY_TYPE[t].icon;
          return (
            <button
              key={t}
              onClick={() => onTypeFilterChange(t)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Icon className="h-3 w-3" />
              {ACTIVITY_TYPE[t].label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <BucketTabs buckets={BUCKETS} counts={dateCounts} value={dateFilter} onChange={onDateFilterChange} destructiveKey="overdue" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Período</span>
          <PeriodSelect value={period} onChange={onPeriodChange} />
        </div>
      </div>
    </>
  );
}
