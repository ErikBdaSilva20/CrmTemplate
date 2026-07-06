import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ArrowUpDown } from "lucide-react";
import { CONTACT_STATUS } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import type { Company, Contact } from "@/lib/data";

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

function SortHeader({ label, field, onSort }: { label: string; field: ContactsSortKey; onSort: (key: ContactsSortKey) => void }) {
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
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
  const getInactivityDays = (contactId: string, createdAt: string | null) => {
    const lastAct = lastActivityMap.get(contactId);
    const ref = lastAct || (createdAt ? new Date(createdAt) : null);
    if (!ref) return null;
    return Math.floor((Date.now() - ref.getTime()) / 86400000);
  };

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
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
          {contacts.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => onRowClick(c.id)}>
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
                      {(() => {
                        const days = getInactivityDays(c.id, c.created_at);
                        if (days === null || days < 14) return null;
                        const isHigh = days >= 21;
                        return (
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
                <Badge variant="secondary" className={CONTACT_STATUS[c.status || "lead"].badgeClassName}>
                  {CONTACT_STATUS[c.status || "lead"].label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{formatDate(c.created_at)}</TableCell>
            </TableRow>
          ))}
          {contacts.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                Nenhum contato encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
