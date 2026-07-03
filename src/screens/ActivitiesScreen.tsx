import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, List, CalendarDays, Trash2, Edit2, MoreHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ActivityCreateEditModal } from "@/components/crm/ActivityCreateEditModal";
import { useActivities } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeals } from "@/hooks/useDeals";
import { ACTIVITY_TYPE, ACTIVITY_TYPES } from "@/lib/domain";
import { startOfDay, endOfDay, getWeekRange, toLocalDateKey } from "@/lib/date";
import { updateActivity, deleteActivity, type Activity } from "@/lib/data";

type ViewMode = "list" | "calendar";
type DateFilter = "todo" | "overdue" | "today" | "tomorrow" | "this_week" | "next_week" | "next_30_days";

const dateFilterLabels: Record<DateFilter, string> = {
  todo: "Para fazer",
  overdue: "Vencido",
  today: "Hoje",
  tomorrow: "Amanhã",
  this_week: "Esta semana",
  next_week: "Próxima semana",
  next_30_days: "Próximos 30 dias",
};

export default function ActivitiesScreen() {
  const { data: activities, refresh: refreshActivities } = useActivities();
  const { data: contacts } = useContacts();
  const { data: companies } = useCompanies();
  const { data: deals } = useDeals();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("todo");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setCreateOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")),
    [activities],
  );

  const toggleComplete = async (activity: Activity) => {
    const completed_at = activity.completed_at ? null : new Date().toISOString();
    await updateActivity(activity.id, { completed_at });
    refreshActivities();
  };

  const removeActivity = async (id: string) => {
    await deleteActivity(id);
    refreshActivities();
    toast.success("Atividade excluída");
  };

  const getContact = (id: string | null) => (id ? contacts.find((c) => c.id === id) : null);
  const getCompany = (id: string | null) => (id ? companies.find((c) => c.id === id) : null);
  const getDeal = (id: string | null) => (id ? deals.find((d) => d.id === id) : null);

  const isOverdue = (a: Activity) => !a.completed_at && a.due_date && new Date(a.due_date) < new Date();

  // Deps corretas: o filtro só depende de activities/typeFilter/dateFilter —
  // contacts/deals nunca eram lidos aqui (AUDITORIA-CODIGO.md §5.2).
  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const tomorrowEnd = endOfDay(tomorrowStart);
    const thisWeek = getWeekRange(0);
    const nextWeek = getWeekRange(1);
    const next30End = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));

    return sortedActivities.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;

      const dueDate = a.due_date ? new Date(a.due_date) : null;
      switch (dateFilter) {
        case "todo":
          return !a.completed_at;
        case "overdue":
          return !a.completed_at && dueDate !== null && dueDate < now;
        case "today":
          return !a.completed_at && dueDate !== null && dueDate >= todayStart && dueDate <= todayEnd;
        case "tomorrow":
          return !a.completed_at && dueDate !== null && dueDate >= tomorrowStart && dueDate <= tomorrowEnd;
        case "this_week":
          return !a.completed_at && dueDate !== null && dueDate >= thisWeek.start && dueDate <= thisWeek.end;
        case "next_week":
          return !a.completed_at && dueDate !== null && dueDate >= nextWeek.start && dueDate <= nextWeek.end;
        case "next_30_days":
          return !a.completed_at && dueDate !== null && dueDate >= todayStart && dueDate <= next30End;
      }
      return true;
    });
  }, [sortedActivities, typeFilter, dateFilter]);

  const counts = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const tomorrowEnd = endOfDay(tomorrowStart);
    const thisWeek = getWeekRange(0);
    const nextWeek = getWeekRange(1);
    const next30End = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));

    const pending = sortedActivities.filter((a) => !a.completed_at);
    return {
      todo: pending.length,
      overdue: pending.filter((a) => a.due_date && new Date(a.due_date) < now).length,
      today: pending.filter((a) => a.due_date && new Date(a.due_date) >= todayStart && new Date(a.due_date) <= todayEnd).length,
      tomorrow: pending.filter((a) => a.due_date && new Date(a.due_date) >= tomorrowStart && new Date(a.due_date) <= tomorrowEnd).length,
      this_week: pending.filter((a) => a.due_date && new Date(a.due_date) >= thisWeek.start && new Date(a.due_date) <= thisWeek.end).length,
      next_week: pending.filter((a) => a.due_date && new Date(a.due_date) >= nextWeek.start && new Date(a.due_date) <= nextWeek.end).length,
      next_30_days: pending.filter((a) => a.due_date && new Date(a.due_date) >= todayStart && new Date(a.due_date) <= next30End).length,
    };
  }, [sortedActivities]);

  const calendarDays = useMemo(() => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      days.push({ date: new Date(year, month + 1, days.length - last.getDate() - startDay + 1), inMonth: false });
    }
    return days;
  }, [calMonth]);

  // Chave por dia em horário LOCAL — toISOString() converte pra UTC e
  // deslocava atividades noturnas (UTC-3) pro dia seguinte no grid
  // (AUDITORIA-CODIGO.md §5.1).
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filtered.forEach((a) => {
      const reference = a.due_date ? new Date(a.due_date) : a.created_at ? new Date(a.created_at) : null;
      if (reference) {
        const dateStr = toLocalDateKey(reference);
        if (!map.has(dateStr)) map.set(dateStr, []);
        map.get(dateStr)!.push(a);
      }
    });
    return map;
  }, [filtered]);

  const todayKey = toLocalDateKey(new Date());
  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} atividades
            {counts.overdue > 0 && <span className="text-destructive font-medium ml-1">· {counts.overdue} atrasadas</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button onClick={() => setViewMode("list")} aria-label="Lista" className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("calendar")} aria-label="Calendário" className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Atividade
          </Button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 pb-2 border-b border-border flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          Tudo
        </button>
        {ACTIVITY_TYPES.map((t) => {
          const Icon = ACTIVITY_TYPE[t].icon;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Icon className="h-3 w-3" />
              {ACTIVITY_TYPE[t].label}
            </button>
          );
        })}
      </div>

      {/* Date filter tabs */}
      <div className="flex items-center gap-0.5 py-2 text-xs flex-wrap">
        {(Object.keys(dateFilterLabels) as DateFilter[]).map((key) => {
          const count = counts[key];
          const isActive = dateFilter === key;
          const isOverdueTab = key === "overdue";
          return (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                isActive
                  ? isOverdueTab && count > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {dateFilterLabels[key]}
              {count > 0 && (
                <span className={`ml-1 text-[10px] ${isOverdueTab ? "text-destructive" : ""}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table view */}
      {viewMode === "list" && (
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
              {filtered.map((a) => {
                const Icon = ACTIVITY_TYPE[a.type].icon;
                const contact = getContact(a.contact_id);
                const deal = getDeal(a.deal_id);
                const company = getCompany(a.company_id) || (contact?.company_id ? getCompany(contact.company_id) : null);
                const overdue = isOverdue(a);

                return (
                  <TableRow
                    key={a.id}
                    className={`group ${a.completed_at ? "opacity-40" : ""} ${overdue ? "bg-destructive/[0.03]" : ""}`}
                  >
                    <TableCell className="pr-0">
                      <Checkbox
                        checked={!!a.completed_at}
                        onCheckedChange={() => toggleComplete(a)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${ACTIVITY_TYPE[a.type].textClassName}`} />
                        <span className={`text-sm font-medium truncate ${a.completed_at ? "line-through" : ""}`}>
                          {a.title}
                        </span>
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
                    <TableCell>
                      {contact?.phone && (
                        <span className="text-xs text-muted-foreground">{contact.phone}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company && (
                        <span className="text-xs text-muted-foreground">{company.name}</span>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => setEditActivity(a)}>
                            <Edit2 className="mr-2 h-3.5 w-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removeActivity(a.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-2">
                      <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <p className="text-sm">Nenhuma atividade encontrada</p>
                      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />Criar atividade
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCalMonth((p) => {
              const d = new Date(p.year, p.month - 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}><ChevronLeft className="h-4 w-4" /></Button>
            <h3 className="text-sm font-semibold">{monthNames[calMonth.month]} {calMonth.year}</h3>
            <Button variant="outline" size="sm" onClick={() => setCalMonth((p) => {
              const d = new Date(p.year, p.month + 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
              <div key={d} className="bg-muted px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = toLocalDateKey(day.date);
              const dayActivities = activitiesByDate.get(dateStr) || [];
              const isToday = dateStr === todayKey;
              return (
                <div key={i} className={`min-h-[80px] bg-background p-1 ${!day.inMonth ? "opacity-40" : ""}`}>
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayActivities.slice(0, 3).map((a) => {
                      const ActIcon = ACTIVITY_TYPE[a.type].icon;
                      return (
                        <div key={a.id} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[9px] truncate bg-muted/50 ${isOverdue(a) ? "ring-1 ring-destructive" : ""}`}>
                          <ActIcon className={`h-2.5 w-2.5 shrink-0 ${ACTIVITY_TYPE[a.type].textClassName}`} />
                          <span className="truncate">{a.title}</span>
                        </div>
                      );
                    })}
                    {dayActivities.length > 3 && (
                      <span className="text-[9px] text-muted-foreground px-1">+{dayActivities.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <ActivityCreateEditModal
        open={createOpen || !!editActivity}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditActivity(null); } }}
        activity={editActivity}
        contacts={contacts}
        companies={companies}
        deals={deals}
        onSaved={refreshActivities}
      />
    </div>
  );
}
