import { createCollectionHook } from "./data-cache";
import { listDeals, type Deal } from "@/lib/data";

const dealsStore = createCollectionHook<Deal>(listDeals);

// Shared cache: every screen showing deals reads the same data and refreshes
// together after `invalidateDeals()` (call it after create/update/delete/move).
export const useDeals = dealsStore.useCollection;
export const invalidateDeals = dealsStore.invalidate;
