import { db } from "./client";
import type { Database } from "./types.gen";

export type SalesGoal = Database["public"]["Tables"]["sales_goals"]["Row"];
export type SalesGoalInsert = Database["public"]["Tables"]["sales_goals"]["Insert"];
export type SalesGoalUpdate = Database["public"]["Tables"]["sales_goals"]["Update"];

// target_value/current_value are Postgres `numeric` — can arrive as strings
// over the gateway's JSON despite the generated `number` type. Normalize
// once here (see Masia Clone-Template Audit Framework §7).
function normalizeSalesGoal(g: SalesGoal): SalesGoal {
  return { ...g, target_value: Number(g.target_value) || 0, current_value: Number(g.current_value) || 0 };
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
