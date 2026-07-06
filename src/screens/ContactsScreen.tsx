import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ContactsKanbanByStatus } from '@/components/crm/ContactsKanbanByStatus';
import { ContactDrawer } from '@/components/crm/ContactDrawer';
import { ContactCreateModal } from '@/components/crm/ContactCreateModal';
import { CSVImportModal } from '@/components/crm/CSVImportModal';
import {
  ContactsToolbar, type ContactFilters, type ContactsViewMode,
} from '@/components/crm/contacts/ContactsToolbar';
import { ContactsTable, type ContactsSortDir, type ContactsSortKey } from '@/components/crm/contacts/ContactsTable';
import { ContactsCardGrid } from '@/components/crm/contacts/ContactsCardGrid';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useActivities } from '@/hooks/useActivities';
import { CONTACT_STATUS, CONTACT_STATUSES } from '@/lib/domain';
import { updateContact, deleteContact, type Contact, type ContactStatus } from '@/lib/data';
import { exportToCsv, type CsvColumn } from '@/lib/csv';

const PAGE_SIZE = 50;

// Orquestrador de layout: busca os dados, mantém filtros/ordenação/seleção
// e delega toda a renderização visual para components/crm/contacts/**
// (Masia Clone-Template Audit Framework §4/§6.1).
export default function ContactsScreen() {
  const { data: contactsRaw, refresh: refreshContacts } = useContacts();
  const { data: companies } = useCompanies();
  const { data: activities } = useActivities();

  const [viewMode, setViewMode] = useState<ContactsViewMode>('table');
  const [sortKey, setSortKey] = useState<ContactsSortKey>('created_at');
  const [sortDir, setSortDir] = useState<ContactsSortDir>('desc');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ContactFilters>({});
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  // Guarda só o id (não o objeto) e deriva o contato ao vivo da cache —
  // senão o Sheet ficava mostrando dados velhos logo após salvar, pois o
  // objeto ficava congelado no momento em que o Sheet foi aberto.
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setCreateOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Espelha a cache compartilhada num state local pra permitir atualização
  // otimista no drag do funil por status (mesmo padrão de DealsScreen) —
  // sem isso, o card só pula de coluna depois do round-trip completo.
  const [contacts, setContacts] = useState(contactsRaw);
  useEffect(() => {
    setContacts(contactsRaw);
  }, [contactsRaw]);

  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [contacts],
  );

  const drawerContact = useMemo(
    () => (drawerContactId ? contacts.find((c) => c.id === drawerContactId) ?? null : null),
    [contacts, drawerContactId],
  );

  const lastActivityMap = useMemo(() => {
    const map = new Map<string, Date>();
    activities.forEach((a) => {
      if (a.contact_id && a.created_at) {
        const d = new Date(a.created_at);
        const existing = map.get(a.contact_id);
        if (!existing || d > existing) map.set(a.contact_id, d);
      }
    });
    return map;
  }, [activities]);

  // Mudar status (substitui o drag de owner do CellRM). Atualização
  // otimista local + invalidação da cache compartilhada em seguida.
  const handleStatusChange = async (contactId: string, newStatus: ContactStatus) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status: newStatus } : c)));
    await updateContact(contactId, { status: newStatus });
    refreshContacts();
    toast.success(`Movido para ${CONTACT_STATUS[newStatus].label}`);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedContacts.filter((c) => {
      if (filters.status && filters.status !== 'all' && c.status !== filters.status) return false;
      if (filters.companyId && c.company_id !== filters.companyId) return false;
      // Compara só a data (YYYY-MM-DD): created_at é timestamp completo, e o
      // <Input type="date"> manda só a data — comparar as strings inteiras
      // fazia um contato criado no próprio dia do "até" ser excluído (a
      // timestamp completa é lexicograficamente "maior" que a data sozinha).
      const createdDate = c.created_at ? c.created_at.slice(0, 10) : null;
      if (filters.createdFrom && createdDate && createdDate < filters.createdFrom) return false;
      if (filters.createdTo && createdDate && createdDate > filters.createdTo) return false;
      if (term) {
        const haystack = `${c.first_name} ${c.last_name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [sortedContacts, filters, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'email':
          cmp = (a.email || '').localeCompare(b.email || '');
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'created_at':
          cmp = (a.created_at || '').localeCompare(b.created_at || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: ContactsSortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allSelected = paginated.length > 0 && paginated.every((c) => selectedContacts.has(c.id));
  const toggleAll = () => {
    if (allSelected) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(paginated.map((c) => c.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedContacts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContacts(next);
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedContacts);
    await Promise.all(ids.map((id) => deleteContact(id)));
    setSelectedContacts(new Set());
    refreshContacts();
    toast.success(`${ids.length} contatos excluídos`);
  };

  const batchChangeStatus = async (status: ContactStatus) => {
    const ids = Array.from(selectedContacts);
    await Promise.all(ids.map((id) => updateContact(id, { status })));
    setSelectedContacts(new Set());
    refreshContacts();
    toast.success(`Status atualizado para ${ids.length} contatos`);
  };

  const exportCSV = () => {
    const columns: CsvColumn<Contact>[] = [
      { label: 'Nome', accessor: (c) => c.first_name },
      { label: 'Sobrenome', accessor: (c) => c.last_name },
      { label: 'Email', accessor: (c) => c.email },
      { label: 'Telefone', accessor: (c) => c.phone },
      { label: 'Cargo', accessor: (c) => c.title },
      { label: 'Empresa', accessor: (c) => companies.find((co) => co.id === c.company_id)?.name },
      { label: 'Status', accessor: (c) => c.status },
    ];
    exportToCsv(sorted, columns, 'contatos.csv');
    toast.success('CSV exportado');
  };

  return (
    <div className="space-y-4">
      <ContactsToolbar
        filteredCount={filtered.length}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        onImportClick={() => setCsvOpen(true)}
        onExportClick={exportCSV}
        onCreateClick={() => setCreateOpen(true)}
      />

      {/* Batch Actions */}
      {selectedContacts.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <span className="text-sm font-medium">{selectedContacts.size} selecionados</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">Mudar Status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {CONTACT_STATUSES.map((status) => (
                <DropdownMenuItem key={status} onClick={() => batchChangeStatus(status)}>
                  {CONTACT_STATUS[status].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="destructive" onClick={batchDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Excluir
          </Button>
        </div>
      )}

      {viewMode === 'table' && (
        <ContactsTable
          contacts={paginated}
          companies={companies}
          lastActivityMap={lastActivityMap}
          onSort={toggleSort}
          selectedContacts={selectedContacts}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onRowClick={setDrawerContactId}
        />
      )}

      {viewMode === 'cards' && (
        <ContactsCardGrid contacts={paginated} onCardClick={setDrawerContactId} />
      )}

      {viewMode === 'status' && (
        <ContactsKanbanByStatus
          contacts={sorted}
          companies={companies}
          onContactClick={(c) => setDrawerContactId(c.id)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Pagination (table/cards only) */}
      {viewMode !== 'status' && totalPages > 1 && (
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
        onClose={() => setDrawerContactId(null)}
        onUpdate={refreshContacts}
        companies={companies}
      />

      <ContactCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshContacts}
        companies={companies}
      />

      <CSVImportModal
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={refreshContacts}
        entityType="contacts"
      />
    </div>
  );
}
