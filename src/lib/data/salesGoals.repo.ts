import { db } from "./client";
import type { Database } from "./types.gen";

export type SalesGoal = Database["public"]["Tables"]["sales_goals"]["Row"];
export type SalesGoalInsert = Database["public"]["Tables"]["sales_goals"]["Insert"];
export type SalesGoalUpdate = Database["public"]["Tables"]["sales_goals"]["Update"];

export const listSalesGoals = () => db.table<SalesGoal>("sales_goals").list();
export const createSalesGoal = (input: SalesGoalInsert) =>
  db.table<SalesGoal>("sales_goals").create(input);
export const updateSalesGoal = (id: string, patch: SalesGoalUpdate) =>
  db.table<SalesGoal>("sales_goals").update(id, patch);
export const deleteSalesGoal = (id: string) => db.table<SalesGoal>("sales_goals").remove(id);

// Meta do período atual — filtro no front.
export const goalsForPeriod = async (month: number, year: number): Promise<SalesGoal[]> =>
  (await listSalesGoals()).filter((g) => g.period_month === month && g.period_year === year);
