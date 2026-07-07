import { createCollectionHook } from "./data-cache";
import { listLossReasons, type LossReason } from "@/lib/data";

const lossReasonsStore = createCollectionHook<LossReason>(listLossReasons);

export const useLossReasons = lossReasonsStore.useCollection;
export const invalidateLossReasons = lossReasonsStore.invalidate;
