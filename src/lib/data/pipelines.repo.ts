import { db } from "./client";
import type { Database } from "./types.gen";
import { DEFAULT_STAGES } from "@/lib/constants";

// Lookups (config): admin/manager escreve, rep só lê. Sem owner_id.
export type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"];
export type PipelineInsert = Database["public"]["Tables"]["pipelines"]["Insert"];
export type PipelineUpdate = Database["public"]["Tables"]["pipelines"]["Update"];

export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type PipelineStageInsert = Database["public"]["Tables"]["pipeline_stages"]["Insert"];
export type PipelineStageUpdate = Database["public"]["Tables"]["pipeline_stages"]["Update"];

export const listPipelines = () => db.table<Pipeline>("pipelines").list();
export const createPipeline = (input: PipelineInsert) =>
  db.table<Pipeline>("pipelines").create(input);
export const updatePipeline = (id: string, patch: PipelineUpdate) =>
  db.table<Pipeline>("pipelines").update(id, patch);
export const deletePipeline = (id: string) => db.table<Pipeline>("pipelines").remove(id);

// win_probability is Postgres `numeric` — can arrive as a string over the
// gateway's JSON despite the generated `number` type. Normalize once here
// (see Masia Clone-Template Audit Framework §7).
function normalizeStage(s: PipelineStage): PipelineStage {
  return { ...s, win_probability: Number(s.win_probability) || 0 };
}

export const listStages = async () =>
  (await db.table<PipelineStage>("pipeline_stages").list()).map(normalizeStage);
export const createStage = async (input: PipelineStageInsert) =>
  normalizeStage(await db.table<PipelineStage>("pipeline_stages").create(input));
export const updateStage = async (id: string, patch: PipelineStageUpdate) =>
  normalizeStage(await db.table<PipelineStage>("pipeline_stages").update(id, patch));
export const deleteStage = (id: string) => db.table<PipelineStage>("pipeline_stages").remove(id);

// Estágios de um pipeline, ordenados — filtro/sort no front.
export const listStagesByPipeline = async (pipelineId: string): Promise<PipelineStage[]> =>
  (await listStages())
    .filter((s) => s.pipeline_id === pipelineId)
    .sort((a, b) => a.sort_order - b.sort_order);

// Pipeline + os 5 estágios padrão (mesmo seed do /setup) — usado tanto no
// onboarding quanto no bootstrap de /deals quando não existe nenhum pipeline.
export async function createDefaultPipeline(name: string): Promise<Pipeline> {
  const pipeline = await createPipeline({ name, is_default: true });
  await Promise.all(
    DEFAULT_STAGES.map((s, i) =>
      createStage({
        pipeline_id: pipeline.id,
        name: s.name,
        color: s.color,
        win_probability: s.win_probability,
        sort_order: i,
      }),
    ),
  );
  return pipeline;
}
