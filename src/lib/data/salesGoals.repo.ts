import { db } from "./client";
import type { Database } from "./types.gen";
import { normalizeNumericFields } from "./normalize";

export type SalesGoal = Database["public"]["Tables"]["sales_goals"]["Row"];
export type SalesGoalInsert = Database["public"]["Tables"]["sales_goals"]["Insert"];
export type SalesGoalUpdate = Database["public"]["Tables"]["sales_goals"]["Update"];

export function normalizeSalesGoal(g: SalesGoal): SalesGoal {
  return normalizeNumericFields(g, ["target_value", "current_value"]);
}

export const listSalesGoals = async () =>
  (await db.table<SalesGoal>("sales_goals").list()).map(normalizeSalesGoal);
export const createSalesGoal = async (input: SalesGoalInsert) =>
  normalizeSalesGoal(await db.table<SalesGoal>("sales_goals").create(input));
export const updateSalesGoal = async (id: string, patch: SalesGoalUpdate) =>
  normalizeSalesGoal(await db.table<SalesGoal>("sales_goals").update(id, patch));
export const deleteSalesGoal = (id: string) => db.table<SalesGoal>("sales_goals").remove(id);

// Meta do período atual — filtro no front.
export const goalsForPeriod = async (month: number, year: number): Promise<SalesGoal[]> =>
  (await listSalesGoals()).filter((g) => g.period_month === month && g.period_year === year);
