import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarDays, Edit2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { ACTIVITY_TYPE } from "@/lib/domain";
import { isActivityOverdue } from "@/lib/date";
import type { Activity, Company, Contact, Deal } from "@/lib/data";

interface ActivitiesTableProps {
  activities: Activity[];
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  onToggleComplete: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
}


// Visão em lista/tabela da tela de Atividades — resolve os relacionamentos
// (contato/negócio/empresa) por lookup no front, já que o modo genérico do
// gateway não faz join (Masia Clone-Template Audit Framework §3, Fase 2).
export function ActivitiesTable({
  activities,
  contacts,
  companies,
  deals,
  onToggleComplete,
  onEdit,
  onDelete,
  onCreateClick,
}: ActivitiesTableProps) {
  const contactsMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const companiesMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const dealsMap = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);

  const getContact = (id: string | null) => (id ? contactsMap.get(id) || null : null);
  const getCompany = (id: string | null) => (id ? companiesMap.get(id) || null : null);
  const getDeal = (id: string | null) => (id ? dealsMap.get(id) || null : null);

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-10"></TableHead>
            <TableHead className="min-w-[200px]">Assunto</TableHead>
            <TableHead>Negócio</TableHead>
            <TableHead>Pessoa de contato</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Organização</TableHead>
            <TableHead>Data de venc.</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((a) => {
            const Icon = ACTIVITY_TYPE[a.type].icon;
            const contact = getContact(a.contact_id);
            const deal = getDeal(a.deal_id);
            const company = getCompany(a.company_id) || (contact?.company_id ? getCompany(contact.company_id) : null);
            const overdue = isActivityOverdue(a);

            return (
              <TableRow key={a.id} className={`group ${a.completed_at ? "opacity-40" : ""} ${overdue ? "bg-destructive/[0.03]" : ""}`}>
                <TableCell className="pr-0">
                  <Checkbox checked={!!a.completed_at} onCheckedChange={() => onToggleComplete(a)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${ACTIVITY_TYPE[a.type].textClassName}`} />
                    <span className={`text-sm font-medium truncate ${a.completed_at ? "line-through" : ""}`}>{a.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {deal && (
                    <Badge variant="secondary" className="text-[10px] font-normal max-w-[160px] truncate">
                      {deal.title}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {contact && (
                    <span className="text-sm">
                      {contact.first_name} {contact.last_name || ""}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {contact?.email && (
                    <a href={`mailto:${contact.email}`} className="text-xs text-primary hover:underline truncate block max-w-[180px]">
                      {contact.email}
                    </a>
                  )}
                </TableCell>
                <TableCell>{contact?.phone && <span className="text-xs text-muted-foreground">{contact.phone}</span>}</TableCell>
                <TableCell>{company && <span className="text-xs text-muted-foreground">{company.name}</span>}</TableCell>
                <TableCell>
                  {a.due_date && (
                    <span className={`text-xs whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {new Date(a.due_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(a)}>
                        <Edit2 className="mr-2 h-3.5 w-3.5" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(a.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {activities.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                <div className="space-y-2">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-sm">Nenhuma atividade encontrada</p>
                  <Button variant="outline" size="sm" onClick={onCreateClick}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />Criar atividade
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
