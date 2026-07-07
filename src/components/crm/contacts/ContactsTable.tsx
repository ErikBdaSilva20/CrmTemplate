import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { CONTACT_STATUS } from "@/lib/domain";
import { formatDate, daysAgo } from "@/lib/format";
import type { Company, Contact } from "@/lib/data";
import { useVirtualTable } from "@/hooks/useVirtualTable";
import { SortHeader } from "@/components/crm/SortHeader";

const COLUMN_COUNT = 8;

export type ContactsSortKey = "name" | "email" | "status" | "created_at" | "title";
export type ContactsSortDir = "asc" | "desc";

interface ContactsTableProps {
  contacts: Contact[];
  companies: Company[];
  lastActivityMap: Map<string, Date>;
  onSort: (key: ContactsSortKey) => void;
  selectedContacts: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onRowClick: (id: string) => void;
}

// Visão em tabela de /contacts — seleção em lote, ordenação por coluna e o
// badge de inatividade (dias desde a última atividade, ou desde a criação
// se nunca houve atividade).
export function ContactsTable({
  contacts,
  companies,
  lastActivityMap,
  onSort,
  selectedContacts,
  allSelected,
  onToggleAll,
  onToggleOne,
  onRowClick,
}: ContactsTableProps) {
  const companiesMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const getInactivityDays = (contactId: string, createdAt: string | null) => {
    const lastAct = lastActivityMap.get(contactId);
    const ref = lastAct || (createdAt ? new Date(createdAt) : null);
    if (!ref) return null;
    return daysAgo(ref);
  };

  const { scrollRef, rows, paddingTop, paddingBottom } = useVirtualTable({
    count: contacts.length,
    estimateRowHeight: 57,
  });

  return (
    <div ref={scrollRef} className="rounded-md border border-border overflow-auto max-h-[70vh]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Selecionar todos" />
            </TableHead>
            <TableHead><SortHeader label="Nome" field="name" onSort={onSort} /></TableHead>
            <TableHead className="hidden sm:table-cell"><SortHeader label="Email" field="email" onSort={onSort} /></TableHead>
            <TableHead className="hidden md:table-cell">Empresa</TableHead>
            <TableHead className="hidden lg:table-cell"><SortHeader label="Cargo" field="title" onSort={onSort} /></TableHead>
            <TableHead className="hidden lg:table-cell">Telefone</TableHead>
            <TableHead><SortHeader label="Status" field="status" onSort={onSort} /></TableHead>
            <TableHead className="hidden md:table-cell"><SortHeader label="Criado em" field="created_at" onSort={onSort} /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 && (
            <tr><td colSpan={COLUMN_COUNT} style={{ height: paddingTop }} /></tr>
          )}
          {rows.map(({ index, key }) => {
            const c = contacts[index];
            const days = getInactivityDays(c.id, c.created_at);
            const isInactive = days !== null && days < 14 ? false : days !== null;
            const isHigh = days !== null && days >= 21;

            return (
              <TableRow key={key} className="cursor-pointer" onClick={() => onRowClick(c.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedContacts.has(c.id)}
                    onCheckedChange={() => onToggleOne(c.id)}
                    aria-label={`Selecionar ${c.first_name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {c.first_name[0]}
                        {c.last_name?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">
                          {c.first_name} {c.last_name}
                        </span>
                        {isInactive && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded ${isHigh ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {days}d
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {days} dias sem atividade
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block sm:hidden">{c.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">{c.email}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell text-xs">
                  {c.company_id ? companiesMap.get(c.company_id)?.name || "—" : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">{c.title}</TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">{c.phone}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={CONTACT_STATUS[c.status || "lead"].badgeClassName}>
                    {CONTACT_STATUS[c.status || "lead"].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{formatDate(c.created_at)}</TableCell>
              </TableRow>
            );
          })}
          {paddingBottom > 0 && (
            <tr><td colSpan={COLUMN_COUNT} style={{ height: paddingBottom }} /></tr>
          )}
          {contacts.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
                Nenhum contato encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
