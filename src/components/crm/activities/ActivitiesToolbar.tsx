import { Button } from "@/components/ui/button";
import { CalendarDays, List, Plus } from "lucide-react";
import { ACTIVITY_TYPE, ACTIVITY_TYPES } from "@/lib/domain";

export type ViewMode = "list" | "calendar";
export type DateFilter = "todo" | "overdue" | "today" | "tomorrow" | "this_week" | "next_week" | "next_30_days";

export const dateFilterLabels: Record<DateFilter, string> = {
  todo: "Para fazer",
  overdue: "Vencido",
  today: "Hoje",
  tomorrow: "Amanhã",
  this_week: "Esta semana",
  next_week: "Próxima semana",
  next_30_days: "Próximos 30 dias",
};

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
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => onViewModeChange("list")}
              aria-label="Lista"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("calendar")}
              aria-label="Calendário"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
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

      <div className="flex items-center gap-0.5 py-2 text-xs flex-wrap">
        {(Object.keys(dateFilterLabels) as DateFilter[]).map((key) => {
          const count = dateCounts[key];
          const isActive = dateFilter === key;
          const isOverdueTab = key === "overdue";
          return (
            <button
              key={key}
              onClick={() => onDateFilterChange(key)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                isActive
                  ? isOverdueTab && count > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {dateFilterLabels[key]}
              {count > 0 && <span className={`ml-1 text-[10px] ${isOverdueTab ? "text-destructive" : ""}`}>({count})</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
