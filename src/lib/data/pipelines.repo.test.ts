import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PipelineStage } from "./pipelines.repo";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

// pipelines.repo.ts only needs db.table(name).create(...) for the paths
// exercised below (createDefaultPipeline → createPipeline + createStage).
// No network call is made; client.ts (protected, real gateway integration)
// is untouched.
vi.mock("./client", () => ({
  db: {
    table: (name: string) => ({
      create: (input: unknown) => createMock(name, input),
    }),
  },
}));

const { normalizeStage, createDefaultPipeline } = await import("./pipelines.repo");

function makeStage(overrides: Partial<PipelineStage>): PipelineStage {
  return {
    id: "stage-1",
    pipeline_id: "pipeline-1",
    name: "Stage",
    sort_order: 0,
    color: null,
    win_probability: 50,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("normalizeStage", () => {
  it("coerces win_probability from a gateway JSON string to a number", () => {
    const stage = makeStage({ win_probability: "75" as unknown as number });
    expect(normalizeStage(stage).win_probability).toBe(75);
  });

  it("defaults win_probability to 0 when missing/invalid", () => {
    const stage = makeStage({ win_probability: null as unknown as number });
    expect(normalizeStage(stage).win_probability).toBe(0);
  });

  it("leaves non-numeric fields untouched", () => {
    const stage = makeStage({ name: "Proposal" });
    expect(normalizeStage(stage).name).toBe("Proposal");
  });
});

describe("createDefaultPipeline", () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockImplementation((name: string, input: Record<string, unknown>) =>
      Promise.resolve({ id: `${name}-id`, ...input }),
    );
  });

  it("creates one pipeline and the 5 default stages linked to it, in sort order", async () => {
    const pipeline = await createDefaultPipeline("Vendas");

    expect(pipeline).toMatchObject({ name: "Vendas", is_default: true });

    const stageCalls = createMock.mock.calls.filter(([table]) => table === "pipeline_stages");
    expect(stageCalls).toHaveLength(5);
    stageCalls.forEach(([, input], i) => {
      expect(input).toMatchObject({ pipeline_id: pipeline.id, sort_order: i });
    });
    expect(stageCalls.map(([, input]) => (input as { name: string }).name)).toEqual([
      "Lead", "Qualificado", "Proposta", "Negociação", "Fechado",
    ]);
  });
});
