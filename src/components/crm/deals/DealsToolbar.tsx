import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Kanban, List, Plus, Settings2 } from "lucide-react";
import type { Pipeline } from "@/lib/data";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

export type DealsViewMode = "kanban" | "list";

interface DealsToolbarProps {
  viewMode: DealsViewMode;
  onViewModeChange: (mode: DealsViewMode) => void;
  onNewDeal: () => void;
  filteredCount: number;
  pipelines: Pipeline[];
  selectedPipeline: string;
  onPipelineChange: (id: string) => void;
  canManage: boolean;
  onOpenPipelineEditor: () => void;
  onToggleFilters: () => void;
}

// Barra de controles do topo de /deals: alternância kanban/lista, criar
// negócio, contador, seletor de pipeline, personalizar pipeline e o toggle
// de filtros — tudo o que só existe pra controlar a visualização abaixo.
export function DealsToolbar({
  viewMode,
  onViewModeChange,
  onNewDeal,
  filteredCount,
  pipelines,
  selectedPipeline,
  onPipelineChange,
  canManage,
  onOpenPipelineEditor,
  onToggleFilters,
}: DealsToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">Negócios</h1>

        <SegmentedToggle
          options={[
            { value: "kanban", label: "Kanban", icon: Kanban, ariaLabel: "Visualização Kanban" },
            { value: "list", label: "Lista", icon: List, ariaLabel: "Visualização Lista" },
          ]}
          value={viewMode}
          onChange={onViewModeChange}
        />

        <Button onClick={onNewDeal} size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Negócio</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {filteredCount} {filteredCount === 1 ? "negócio" : "negócios"}
        </span>

        {pipelines.length > 0 && (
          <Select value={selectedPipeline} onValueChange={onPipelineChange}>
            <SelectTrigger className="h-8 w-40 text-xs border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {canManage && (
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!selectedPipeline} onClick={onOpenPipelineEditor} aria-label="Personalizar pipeline">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button variant="outline" size="sm" className="h-8" onClick={onToggleFilters} aria-label="Alternar filtros">
          <Filter className="mr-1 h-3 w-3" /><span className="hidden sm:inline">Filtro</span>
        </Button>
      </div>
    </div>
  );
}
