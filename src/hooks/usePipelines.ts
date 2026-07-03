import { createCollectionHook } from "./data-cache";
import { listPipelines, listStages, type Pipeline, type PipelineStage } from "@/lib/data";

const pipelinesStore = createCollectionHook<Pipeline>(listPipelines);
const stagesStore = createCollectionHook<PipelineStage>(listStages);

export const usePipelines = pipelinesStore.useCollection;
export const invalidatePipelines = pipelinesStore.invalidate;

export const useStages = stagesStore.useCollection;
export const invalidateStages = stagesStore.invalidate;
