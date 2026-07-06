import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Columns3, Download, Filter, LayoutGrid, List, Plus, Search, Upload, X } from "lucide-react";
import { CONTACT_STATUS, CONTACT_STATUSES } from "@/lib/domain";
import type { Company } from "@/lib/data";

export type ContactsViewMode = "table" | "cards" | "status";

export interface ContactFilters {
  status?: string;
  companyId?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface ContactsToolbarProps {
  filteredCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ContactsViewMode;
  onViewModeChange: (mode: ContactsViewMode) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  companies: Company[];
  onImportClick: () => void;
  onExportClick: () => void;
  onCreateClick: () => void;
}

// Cabeçalho de /contacts (busca, alternância de visualização, ações) + o
// painel de filtros expansível — vivem juntos porque o painel só existe em
// função do botão "Filtros" deste cabeçalho.
export function ContactsToolbar({
  filteredCount,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  filters,
  onFiltersChange,
  companies,
  onImportClick,
  onExportClick,
  onCreateClick,
}: ContactsToolbarProps) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{filteredCount} contatos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar nome, email ou telefone"
              className="h-8 pl-7 pr-7 text-xs"
              aria-label="Buscar contatos"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => onViewModeChange("table")}
              aria-label="Visualização tabela"
              className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              onClick={() => onViewModeChange("cards")}
              aria-label="Visualização cartões"
              className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cartões</span>
            </button>
            <button
              onClick={() => onViewModeChange("status")}
              aria-label="Visualização funil por status"
              className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "status" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Funil</span>
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onToggleFilters} aria-label="Alternar filtros">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onImportClick} aria-label="Importar CSV" className="hidden sm:flex">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Importar
          </Button>
          <Button variant="outline" size="sm" onClick={onExportClick} aria-label="Exportar CSV" className="hidden sm:flex">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar
          </Button>
          <Button onClick={onCreateClick} aria-label="Criar novo contato">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Novo Contato</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CONTACT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{CONTACT_STATUS[status].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Empresa</Label>
            <Select
              value={filters.companyId || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, companyId: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Criado de</Label>
            <Input
              type="date"
              className="w-36 h-8 text-xs"
              value={filters.createdFrom ?? ""}
              onChange={(e) => onFiltersChange({ ...filters, createdFrom: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">até</Label>
            <Input
              type="date"
              className="w-36 h-8 text-xs"
              value={filters.createdTo ?? ""}
              onChange={(e) => onFiltersChange({ ...filters, createdTo: e.target.value || undefined })}
            />
          </div>
          {Object.values(filters).some(Boolean) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onFiltersChange({})}>
              <X className="mr-1 h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      )}
    </>
  );
}
