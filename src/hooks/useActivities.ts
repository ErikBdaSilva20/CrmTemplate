import { createCollectionHook } from "./data-cache";
import { listActivities, type Activity } from "@/lib/data";

const activitiesStore = createCollectionHook<Activity>(listActivities);

// Tasks are activities with type "task" (see activities.repo.ts) — they share
// this same cache, so completing a task also refreshes the Activities screen.
export const useActivities = activitiesStore.useCollection;
export const invalidateActivities = activitiesStore.invalidate;
