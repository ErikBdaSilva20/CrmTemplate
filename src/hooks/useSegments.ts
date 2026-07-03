import { createCollectionHook } from "./data-cache";
import { listSegments, type Segment } from "@/lib/data";

const segmentsStore = createCollectionHook<Segment>(listSegments);

export const useSegments = segmentsStore.useCollection;
export const invalidateSegments = segmentsStore.invalidate;
