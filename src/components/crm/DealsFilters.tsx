import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Filtro de "Responsável" removido: no modo genérico não há diretório de usuários
// e o rep só enxerga os próprios registros (isolamento no gateway).
export interface DealFilters {
  minValue?: number;
  maxValue?: number;
  closeDateFrom?: string;
  closeDateTo?: string;
}

interface DealsFiltersProps {
  filters: DealFilters;
  onFiltersChange: (f: DealFilters) => void;
}

export function DealsFilters({ filters, onFiltersChange }: DealsFiltersProps) {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="space-y-1">
        <Label className="text-xs">Valor mín.</Label>
        <Input
          type="number"
          className="w-28 h-8 text-xs"
          placeholder="0"
          value={filters.minValue ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, minValue: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Valor máx.</Label>
        <Input
          type="number"
          className="w-28 h-8 text-xs"
          placeholder="∞"
          value={filters.maxValue ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, maxValue: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Fechamento de</Label>
        <Input
          type="date"
          className="w-36 h-8 text-xs"
          value={filters.closeDateFrom ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, closeDateFrom: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">até</Label>
        <Input
          type="date"
          className="w-36 h-8 text-xs"
          value={filters.closeDateTo ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, closeDateTo: e.target.value || undefined })}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => onFiltersChange({})}>
          <X className="mr-1 h-3 w-3" />Limpar
        </Button>
      )}
    </div>
  );
}
