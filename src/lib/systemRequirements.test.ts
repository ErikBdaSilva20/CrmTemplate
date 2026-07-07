import { describe, it, expect } from "vitest";
import { computeSystemRequirements, type SystemRequirementsInput } from "./systemRequirements";

function makeInput(overrides: Partial<SystemRequirementsInput>): SystemRequirementsInput {
  return {
    pipelines: [],
    stages: [],
    lossReasons: [],
    companies: [],
    ...overrides,
  };
}

describe("computeSystemRequirements", () => {
  it("flags pipeline as unmet when there are no pipelines or no stages", () => {
    const noPipeline = computeSystemRequirements(makeInput({}));
    expect(noPipeline.find((r) => r.id === "pipeline")?.met).toBe(false);

    const pipelineNoStages = computeSystemRequirements(
      makeInput({ pipelines: [{ id: "p1" } as never] }),
    );
    expect(pipelineNoStages.find((r) => r.id === "pipeline")?.met).toBe(false);
  });

  it("marks pipeline as met once at least one pipeline and one stage exist", () => {
    const result = computeSystemRequirements(
      makeInput({ pipelines: [{ id: "p1" } as never], stages: [{ id: "s1" } as never] }),
    );
    expect(result.find((r) => r.id === "pipeline")?.met).toBe(true);
  });

  it("flags loss_reason as unmet (blocking) when there are none", () => {
    const result = computeSystemRequirements(makeInput({}));
    const item = result.find((r) => r.id === "loss_reason");
    expect(item?.met).toBe(false);
    expect(item?.severity).toBe("blocking");
  });

  it("treats company as recommended, not blocking, when missing", () => {
    const result = computeSystemRequirements(makeInput({}));
    const item = result.find((r) => r.id === "company");
    expect(item?.met).toBe(false);
    expect(item?.severity).toBe("recommended");
  });

  it("marks everything met when all data is present", () => {
    const result = computeSystemRequirements({
      pipelines: [{ id: "p1" } as never],
      stages: [{ id: "s1" } as never],
      lossReasons: [{ id: "lr1" } as never],
      companies: [{ id: "c1" } as never],
    });
    expect(result.every((r) => r.met)).toBe(true);
  });
});
