import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ACTIVITY_TYPE } from "@/lib/domain";
import { toLocalDateKey, isActivityOverdue } from "@/lib/date";
import type { Activity } from "@/lib/data";

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];


export interface CalendarMonth {
  year: number;
  month: number;
}

interface ActivitiesCalendarProps {
  activities: Activity[];
  calMonth: CalendarMonth;
  onMonthChange: (next: CalendarMonth) => void;
}

// Grade mensal com as atividades do dia — nav de mês, dias e células vivem
// num arquivo só porque o grid não existe fora do contexto do mês atual
// (nenhuma outra tela reaproveita "uma célula" isoladamente).
export function ActivitiesCalendar({ activities, calMonth, onMonthChange }: ActivitiesCalendarProps) {
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
    activities.forEach((a) => {
      const reference = a.due_date ? new Date(a.due_date) : a.created_at ? new Date(a.created_at) : null;
      if (reference) {
        const dateStr = toLocalDateKey(reference);
        if (!map.has(dateStr)) map.set(dateStr, []);
        map.get(dateStr)!.push(a);
      }
    });
    return map;
  }, [activities]);

  const todayKey = toLocalDateKey(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const d = new Date(calMonth.year, calMonth.month - 1);
            onMonthChange({ year: d.getFullYear(), month: d.getMonth() });
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">
          {MONTH_NAMES_PT[calMonth.month]} {calMonth.year}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const d = new Date(calMonth.year, calMonth.month + 1);
            onMonthChange({ year: d.getFullYear(), month: d.getMonth() });
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden">
        {WEEKDAYS_PT.map((d) => (
          <div key={d} className="bg-muted px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {calendarDays.map((day, i) => {
          const dateStr = toLocalDateKey(day.date);
          const dayActivities = activitiesByDate.get(dateStr) || [];
          const isToday = dateStr === todayKey;
          return (
            <div key={i} className={`min-h-[80px] bg-background p-1 ${!day.inMonth ? "opacity-40" : ""}`}>
              <div
                className={`text-xs font-medium mb-0.5 ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {day.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayActivities.slice(0, 3).map((a) => {
                  const ActIcon = ACTIVITY_TYPE[a.type].icon;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1 rounded px-1 py-0.5 text-[9px] truncate bg-muted/50 ${isActivityOverdue(a) ? "ring-1 ring-destructive" : ""}`}
                    >
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
  );
}
