import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, LayoutGrid, List, Filter, Upload, Download,
  Trash2, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { toast } from "sonner";
import { CompanyDrawer } from "@/components/crm/CompanyDrawer";
import { CompanyCreateModal } from "@/components/crm/CompanyCreateModal";
import { CompanyLogo } from "@/components/crm/CompanyLogo";
import { CSVImportModal } from "@/components/crm/CSVImportModal";
import { PeriodSelect } from "@/components/crm/PeriodSelect";
import { SortHeader } from "@/components/crm/SortHeader";
import { COMPANY_SIZES } from "@/lib/constants";
import { useCompanies } from "@/hooks/useCompanies";
import { roleAtLeast, useAuth } from "@/lib/auth";
import { deleteCompany, type Company } from "@/lib/data";
import { formatCurrencyCompact, formatDate } from "@/lib/format";
import { exportToCsv, type CsvColumn } from "@/lib/csv";
import { isInInterval, resolvePeriod, type Period } from "@/lib/period";
import { runBatch, reportBatchResult } from "@/lib/batch";
import { isAllSelected, toggleSetAll, toggleSetOne } from "@/lib/selection";

const EXPORT_COLUMNS: CsvColumn<Company>[] = [
  { label: "Nome", accessor: (c) => c.name },
  { label: "Domínio", accessor: (c) => c.domain },
  { label: "Indústria", accessor: (c) => c.industry },
  { label: "Tamanho", accessor: (c) => c.size },
  { label: "Receita", accessor: (c) => c.revenue },
  { label: "Website", accessor: (c) => c.website },
];

type SortKey = "name" | "domain" | "industry" | "size" | "revenue" | "created_at";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "cards";
const PAGE_SIZE = 50;

interface CompanyFilters {
  industry?: string;
  size?: string;
}

// "Tudo" preserva o comportamento atual (zero filtro de data) até o
// usuário escolher um Período — Companies nunca teve filtro de data antes
// desta feature (FR-13), então não há regressão a evitar.
const DEFAULT_PERIOD: Period = { kind: "preset", preset: "all" };

export default function CompaniesScreen() {
  const { role } = useAuth();
  // Exclusão em lote é destrutiva e irreversível — mesmo gate de config
  // estrutural (admin/manager), espelhando ContactsScreen.
  const canDelete = roleAtLeast(role, "manager");

  const { data: companiesRaw, refresh: refreshCompanies } = useCompanies();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<CompanyFilters>({});
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());

  // Guarda só o id e deriva a empresa ao vivo da cache — evita o Sheet
  // mostrar dados velhos logo após salvar (o objeto ficava congelado no
  // momento em que o Sheet foi aberto).
  const [drawerCompanyId, setDrawerCompanyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setCreateOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const companies = useMemo(
    () => [...companiesRaw].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [companiesRaw],
  );

  const drawerCompany = useMemo(
    () => (drawerCompanyId ? companies.find((c) => c.id === drawerCompanyId) ?? null : null),
    [companies, drawerCompanyId],
  );

  const industries = useMemo(() => {
    return [...new Set(companies.map((c) => c.industry).filter(Boolean))] as string[];
  }, [companies]);

  // Resolve o Período uma vez por mudança de seleção — camada compartilhada
  // (src/lib/period.ts), não uma sexta implementação de filtro de data.
  const periodInterval = useMemo(() => resolvePeriod(period), [period]);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (filters.industry && c.industry !== filters.industry) return false;
      if (filters.size && c.size !== filters.size) return false;
      if (!isInInterval(c.created_at, periodInterval)) return false;
      return true;
    });
  }, [companies, filters, periodInterval]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "domain": cmp = (a.domain || "").localeCompare(b.domain || ""); break;
        case "industry": cmp = (a.industry || "").localeCompare(b.industry || ""); break;
        case "size": cmp = (a.size || "").localeCompare(b.size || ""); break;
        case "revenue": cmp = (a.revenue ?? 0) - (b.revenue ?? 0); break;
        case "created_at": cmp = (a.created_at || "").localeCompare(b.created_at || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const paginatedIds = useMemo(() => paginated.map((c) => c.id), [paginated]);
  const allSelected = isAllSelected(selectedCompanies, paginatedIds);
  const toggleAll = () => setSelectedCompanies((prev) => toggleSetAll(prev, paginatedIds));
  const toggleOne = (id: string) => setSelectedCompanies((prev) => toggleSetOne(prev, id));

  const batchDelete = async () => {
    const ids = Array.from(selectedCompanies);
    const result = await runBatch(ids, deleteCompany);
    setSelectedCompanies(new Set(result.failed.map((f) => f.id)));
    refreshCompanies();
    reportBatchResult(result, {
      success: (n) => `${n} empresas excluídas`,
      failure: (n) => `${n} empresas não puderam ser excluídas`,
    });
  };

  const exportCSV = () => {
    exportToCsv(sorted, EXPORT_COLUMNS, "empresas.csv");
    toast.success("CSV exportado");
  };

  const formatRevenue = (v: number | null) => v ? formatCurrencyCompact(v) : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{filtered.length} empresas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button onClick={() => setViewMode("table")} aria-label="Visualização tabela" className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tabela</span>
            </button>
            <button onClick={() => setViewMode("cards")} aria-label="Visualização cartões" className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cartões</span>
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} aria-label="Alternar filtros">
            <Filter className="mr-1 h-3.5 w-3.5" /><span className="hidden sm:inline">Filtros</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} aria-label="Importar CSV">
            <Upload className="sm:mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Importar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} aria-label="Exportar CSV">
            <Download className="sm:mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button onClick={() => setCreateOpen(true)} aria-label="Criar nova empresa">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Nova Empresa</span><span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Indústria</Label>
            <Select value={filters.industry || "all"} onValueChange={(v) => setFilters({ ...filters, industry: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tamanho</Label>
            <Select value={filters.size || "all"} onValueChange={(v) => setFilters({ ...filters, size: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Criado em</Label>
            <PeriodSelect value={period} onChange={setPeriod} />
          </div>
          {(Object.values(filters).some(Boolean) || period.kind !== "preset" || period.preset !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setFilters({});
                setPeriod(DEFAULT_PERIOD);
              }}
            >
              <X className="mr-1 h-3 w-3" />Limpar
            </Button>
          )}
        </div>
      )}

      {selectedCompanies.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <span className="text-sm font-medium">{selectedCompanies.size} selecionadas</span>
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={batchDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />Excluir
            </Button>
          )}
        </div>
      )}

      {viewMode === "table" && (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todas" /></TableHead>
                <TableHead><SortHeader label="Empresa" field="name" onSort={toggleSort} /></TableHead>
                <TableHead className="hidden sm:table-cell"><SortHeader label="Domínio" field="domain" onSort={toggleSort} /></TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Indústria" field="industry" onSort={toggleSort} /></TableHead>
                <TableHead className="hidden lg:table-cell"><SortHeader label="Tamanho" field="size" onSort={toggleSort} /></TableHead>
                <TableHead className="hidden lg:table-cell"><SortHeader label="Receita" field="revenue" onSort={toggleSort} /></TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Criado em" field="created_at" onSort={toggleSort} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setDrawerCompanyId(c.id)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedCompanies.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CompanyLogo domain={c.domain} className="h-8 w-8 rounded-md" iconClassName="h-4 w-4" />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{c.domain}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{c.industry}</TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">{c.size}</TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">{formatRevenue(c.revenue)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                    {formatDate(c.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma empresa encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {paginated.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrawerCompanyId(c.id)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <CompanyLogo domain={c.domain} className="h-10 w-10 rounded-md" iconClassName="h-5 w-5" />
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{c.name}</p>
                    {c.industry && <p className="text-xs text-muted-foreground truncate">{c.industry}</p>}
                  </div>
                </div>
                {c.domain && <p className="text-xs text-muted-foreground">{c.domain}</p>}
                {c.revenue && <p className="text-sm font-semibold text-primary">{formatRevenue(c.revenue)}</p>}
              </CardContent>
            </Card>
          ))}
          {paginated.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">Nenhuma empresa encontrada</div>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages} · {sorted.length} empresas</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <CompanyDrawer company={drawerCompany} onClose={() => setDrawerCompanyId(null)} onUpdate={refreshCompanies} />
      <CompanyCreateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={refreshCompanies} />
      <CSVImportModal open={csvOpen} onOpenChange={setCsvOpen} onImported={refreshCompanies} entityType="companies" />
    </div>
  );
}
