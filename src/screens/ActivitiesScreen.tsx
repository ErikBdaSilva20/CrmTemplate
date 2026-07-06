import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ActivityCreateEditModal } from "@/components/crm/ActivityCreateEditModal";
import { ActivitiesToolbar, type DateFilter, type ViewMode } from "@/components/crm/activities/ActivitiesToolbar";
import { ActivitiesTable } from "@/components/crm/activities/ActivitiesTable";
import { ActivitiesCalendar, type CalendarMonth } from "@/components/crm/activities/ActivitiesCalendar";
import { useActivities } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeals } from "@/hooks/useDeals";
import { startOfDay, endOfDay, getWeekRange } from "@/lib/date";
import { updateActivity, deleteActivity, type Activity } from "@/lib/data";

// Orquestrador de layout: busca os dados, calcula os filtros/contagens e
// delega toda a renderização visual para os subcomponentes em
// components/crm/activities/** (Masia Clone-Template Audit Framework §4/§6.1).
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

  const [calMonth, setCalMonth] = useState<CalendarMonth>(() => {
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

  return (
    <div className="space-y-0">
      <ActivitiesToolbar
        totalCount={filtered.length}
        overdueCount={counts.overdue}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => setCreateOpen(true)}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        dateCounts={counts}
      />

      {viewMode === "list" && (
        <ActivitiesTable
          activities={filtered}
          contacts={contacts}
          companies={companies}
          deals={deals}
          onToggleComplete={toggleComplete}
          onEdit={setEditActivity}
          onDelete={removeActivity}
          onCreateClick={() => setCreateOpen(true)}
        />
      )}

      {viewMode === "calendar" && (
        <ActivitiesCalendar activities={filtered} calMonth={calMonth} onMonthChange={setCalMonth} />
      )}

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
