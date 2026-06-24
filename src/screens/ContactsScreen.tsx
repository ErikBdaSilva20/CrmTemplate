import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, LayoutGrid, List, Filter, ArrowUpDown, Upload, Download,
  Trash2, ChevronLeft, ChevronRight, X, AlertTriangle, Columns3, Bookmark,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ContactsKanbanByStatus } from "@/components/crm/ContactsKanbanByStatus";
import { ContactDrawer } from "@/components/crm/ContactDrawer";
import { ContactCreateModal } from "@/components/crm/ContactCreateModal";
import { CSVImportModal } from "@/components/crm/CSVImportModal";
import {
  listContacts, updateContact, deleteContact,
  listCompanies, listActivities, listSegments,
  type Contact, type Company, type ContactStatus, type Segment,
} from "@/lib/data";
import { formatDate } from "@/lib/format";

const statusColors: Record<ContactStatus, string> = {
  lead: "bg-primary/10 text-primary",
  prospect: "bg-warning/10 text-warning",
  customer: "bg-success/10 text-success",
  churned: "bg-destructive/10 text-destructive",
};
const statusLabels: Record<ContactStatus, string> = {
  lead: "Lead", prospect: "Prospect", customer: "Cliente", churned: "Churned",
};

type SortKey = "name" | "email" | "status" | "created_at" | "title";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "cards" | "status";

const PAGE_SIZE = 50;

interface ContactFilters {
  status?: string;
  companyId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ContactFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  const [drawerContact, setDrawerContact] = useState<Contact | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const [lastActivityMap, setLastActivityMap] = useState<Map<string, Date>>(new Map());

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setCreateOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Sem org_id, sem join, sem realtime — refetch após mutação (§5).
  const fetchData = useCallback(async () => {
    const [contactsAll, companiesAll, activitiesAll, segsAll] = await Promise.all([
      listContacts(), listCompanies(), listActivities(), listSegments(),
    ]);
    setContacts([...contactsAll].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")));
    setCompanies(companiesAll);

    const map = new Map<string, Date>();
    activitiesAll.forEach((a) => {
      if (a.contact_id && a.created_at) {
        const d = new Date(a.created_at);
        const existing = map.get(a.contact_id);
        if (!existing || d > existing) map.set(a.contact_id, d);
      }
    });
    setLastActivityMap(map);
    setSegments(segsAll.filter((s) => {
      const entity = (s.filters as Record<string, unknown>)?.entity;
      return !entity || entity === "contacts";
    }));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getInactivityDays = (contactId: string, createdAt: string | null) => {
    const lastAct = lastActivityMap.get(contactId);
    const ref = lastAct || (createdAt ? new Date(createdAt) : null);
    if (!ref) return null;
    return Math.floor((Date.now() - ref.getTime()) / 86400000);
  };

  // Mudar status (substitui o drag de owner do FlowCRM).
  const handleStatusChange = async (contactId: string, newStatus: ContactStatus) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status: newStatus } : c)));
    await updateContact(contactId, { status: newStatus });
    toast.success(`Movido para ${statusLabels[newStatus]}`);
  };

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const searchStr = `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase();
      if (search && !searchStr.includes(search.toLowerCase())) return false;
      if (filters.status && filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.companyId && c.company_id !== filters.companyId) return false;
      if (filters.createdFrom && c.created_at && c.created_at < filters.createdFrom) return false;
      if (filters.createdTo && c.created_at && c.created_at > filters.createdTo) return false;
      return true;
    });
  }, [contacts, search, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); break;
        case "email": cmp = (a.email || "").localeCompare(b.email || ""); break;
        case "status": cmp = (a.status || "").localeCompare(b.status || ""); break;
        case "title": cmp = (a.title || "").localeCompare(b.title || ""); break;
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

  const allSelected = paginated.length > 0 && paginated.every((c) => selectedContacts.has(c.id));
  const toggleAll = () => {
    if (allSelected) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(paginated.map((c) => c.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedContacts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedContacts(next);
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedContacts);
    await Promise.all(ids.map((id) => deleteContact(id)));
    setSelectedContacts(new Set());
    fetchData();
    toast.success(`${ids.length} contatos excluídos`);
  };

  const batchChangeStatus = async (status: ContactStatus) => {
    const ids = Array.from(selectedContacts);
    await Promise.all(ids.map((id) => updateContact(id, { status })));
    setSelectedContacts(new Set());
    fetchData();
    toast.success(`Status atualizado para ${ids.length} contatos`);
  };

  const exportCSV = () => {
    const rows = sorted.map((c) => {
      const comp = companies.find((co) => co.id === c.company_id);
      return {
        Nome: c.first_name, Sobrenome: c.last_name || "", Email: c.email || "",
        Telefone: c.phone || "", Cargo: c.title || "", Empresa: comp?.name || "", Status: c.status || "",
      };
    });
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${(r as Record<string, unknown>)[h] || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contatos.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const applySegment = (seg: Segment) => {
    const f = seg.filters as Record<string, unknown>;
    setFilters({ status: f?.status && f.status !== "any" ? String(f.status) : undefined });
    setActiveSegmentId(seg.id);
  };

  const clearSegment = () => {
    setActiveSegmentId(null);
    setFilters({});
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{filtered.length} contatos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button onClick={() => setViewMode("table")} aria-label="Visualização tabela" className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tabela</span>
            </button>
            <button onClick={() => setViewMode("cards")} aria-label="Visualização cartões" className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cartões</span>
            </button>
            <button onClick={() => setViewMode("status")} aria-label="Visualização funil por status" className={`flex items-center gap-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "status" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Columns3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Funil</span>
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} aria-label="Alternar filtros">
            <Filter className="mr-1 h-3.5 w-3.5" /><span className="hidden sm:inline">Filtros</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={activeSegmentId ? "secondary" : "outline"} size="sm" aria-label="Filtros salvos">
                <Bookmark className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {activeSegmentId ? (segments.find((s) => s.id === activeSegmentId)?.name ?? "Segmentos") : "Segmentos"}
                </span>
                {activeSegmentId && (
                  <X className="ml-1 h-3 w-3 hover:text-destructive" onClick={(e) => { e.stopPropagation(); clearSegment(); }} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {segments.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum filtro salvo</DropdownMenuItem>
              ) : segments.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => applySegment(s)} className={`text-xs ${activeSegmentId === s.id ? "font-medium" : ""}`}>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} aria-label="Importar CSV" className="hidden sm:flex">
            <Upload className="mr-1.5 h-3.5 w-3.5" />Importar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} aria-label="Exportar CSV" className="hidden sm:flex">
            <Download className="mr-1.5 h-3.5 w-3.5" />Exportar
          </Button>
          <Button onClick={() => setCreateOpen(true)} aria-label="Criar novo contato">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Novo Contato</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Empresa</Label>
            <Select value={filters.companyId || "all"} onValueChange={(v) => setFilters({ ...filters, companyId: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Criado de</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={filters.createdFrom ?? ""} onChange={(e) => setFilters({ ...filters, createdFrom: e.target.value || undefined })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">até</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={filters.createdTo ?? ""} onChange={(e) => setFilters({ ...filters, createdTo: e.target.value || undefined })} />
          </div>
          {Object.values(filters).some(Boolean) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilters({})}>
              <X className="mr-1 h-3 w-3" />Limpar
            </Button>
          )}
        </div>
      )}

      {/* Batch Actions */}
      {selectedContacts.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <span className="text-sm font-medium">{selectedContacts.size} selecionados</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">Mudar Status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => batchChangeStatus("lead")}>Lead</DropdownMenuItem>
              <DropdownMenuItem onClick={() => batchChangeStatus("prospect")}>Prospect</DropdownMenuItem>
              <DropdownMenuItem onClick={() => batchChangeStatus("customer")}>Cliente</DropdownMenuItem>
              <DropdownMenuItem onClick={() => batchChangeStatus("churned")}>Churned</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="destructive" onClick={batchDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />Excluir
          </Button>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" /></TableHead>
                <TableHead><SortHeader label="Nome" field="name" /></TableHead>
                <TableHead className="hidden sm:table-cell"><SortHeader label="Email" field="email" /></TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell"><SortHeader label="Cargo" field="title" /></TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead><SortHeader label="Status" field="status" /></TableHead>
                <TableHead className="hidden md:table-cell"><SortHeader label="Criado em" field="created_at" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setDrawerContact(c)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedContacts.has(c.id)} onCheckedChange={() => toggleOne(c.id)} aria-label={`Selecionar ${c.first_name}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {c.first_name[0]}{c.last_name?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{c.first_name} {c.last_name}</span>
                          {(() => {
                            const days = getInactivityDays(c.id, c.created_at);
                            if (days === null || days < 14) return null;
                            const isHigh = days >= 21;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded ${isHigh ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                                      <AlertTriangle className="h-2.5 w-2.5" />{days}d
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {days} dias sem atividade
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block sm:hidden">{c.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell text-xs">
                    {companies.find((co) => co.id === c.company_id)?.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">{c.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[c.status || "lead"]}>
                      {statusLabels[c.status || "lead"]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                    {formatDate(c.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum contato encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Card View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {paginated.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrawerContact(c)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {c.first_name[0]}{c.last_name?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{c.first_name} {c.last_name}</p>
                    {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                  </div>
                </div>
                {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                <Badge variant="secondary" className={`text-[10px] ${statusColors[c.status || "lead"]}`}>
                  {statusLabels[c.status || "lead"]}
                </Badge>
              </CardContent>
            </Card>
          ))}
          {paginated.length === 0 && (
            <div className="col-span-full py-10 text-center text-muted-foreground">Nenhum contato encontrado</div>
          )}
        </div>
      )}

      {/* Status Funnel Kanban */}
      {viewMode === "status" && (
        <ContactsKanbanByStatus
          contacts={sorted}
          companies={companies}
          onContactClick={(c) => setDrawerContact(c)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Pagination (table/cards only) */}
      {viewMode !== "status" && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} · {sorted.length} contatos
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ContactDrawer
        contact={drawerContact}
        onClose={() => setDrawerContact(null)}
        onUpdate={fetchData}
        companies={companies}
      />

      <ContactCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchData}
        companies={companies}
      />

      <CSVImportModal
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={fetchData}
        entityType="contacts"
      />
    </div>
  );
}
