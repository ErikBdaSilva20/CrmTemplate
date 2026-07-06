// Date helpers shared by ActivitiesScreen, TasksScreen and DashboardScreen.
// Extracted from ActivitiesScreen (AUDITORIA-CODIGO.md §2) — was duplicated
// verbatim in TasksScreen.

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Monday-to-Sunday week containing `today + offsetWeeks * 7 days`.
export function getWeekRange(offsetWeeks = 0): DateRange {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: startOfDay(monday), end: endOfDay(sunday) };
}

// Local (not UTC) YYYY-MM-DD key for grouping by calendar day.
//
// AUDITORIA-CODIGO.md §5.1: `date.toISOString().split("T")[0]` converts to
// UTC first, so an activity due at 22:00 in UTC-3 lands on the *next* day in
// the grid, and "today" can highlight the wrong cell near midnight. Building
// the key from local getFullYear/getMonth/getDate avoids the UTC shift.
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isActivityOverdue(activity: { completed_at?: string | Date | null; due_date?: string | Date | null }): boolean {
  return !activity.completed_at && !!activity.due_date && new Date(activity.due_date) < new Date();
}

