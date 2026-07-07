import { createCollectionHook } from "./data-cache";
import { listSalesGoals, type SalesGoal } from "@/lib/data";

const salesGoalsStore = createCollectionHook<SalesGoal>(listSalesGoals);

export const useSalesGoals = salesGoalsStore.useCollection;
export const invalidateSalesGoals = salesGoalsStore.invalidate;
