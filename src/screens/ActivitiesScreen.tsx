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
import { filterByBucket, countByBucket } from "@/lib/activityBuckets";
import { isInInterval, resolvePeriod, type Period } from "@/lib/period";
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
  // Período analítico (FR-16) — "Tudo" preserva o comportamento atual (zero
  // recorte por Período) até o usuário escolher um.
  const [period, setPeriod] = useState<Period>({ kind: "preset", preset: "all" });
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

  const periodInterval = useMemo(() => resolvePeriod(period), [period]);

  // Bucket (src/lib/activityBuckets.ts) filtra por due_date — operacional,
  // "o que fazer agora". Período (src/lib/period.ts) filtra por created_at —
  // analítico, "como foi o intervalo X" (FR-16, Glossário do PRD §3). Os
  // dois participam aqui, lado a lado, como condições independentes.
  const filtered = useMemo(() => {
    const byType = typeFilter === "all" ? sortedActivities : sortedActivities.filter((a) => a.type === typeFilter);
    const byBucket = filterByBucket(byType, dateFilter);
    return byBucket.filter((a) => isInInterval(a.created_at, periodInterval));
  }, [sortedActivities, typeFilter, dateFilter, periodInterval]);

  const counts = useMemo(
    () => countByBucket(sortedActivities, ["todo", "overdue", "today", "tomorrow", "this_week", "next_week", "next_30_days"]),
    [sortedActivities],
  ) as Record<DateFilter, number>;

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
        period={period}
        onPeriodChange={setPeriod}
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
