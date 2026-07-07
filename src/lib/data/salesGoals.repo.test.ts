import { describe, it, expect } from "vitest";
import { normalizeSalesGoal } from "./salesGoals.repo";
import type { SalesGoal } from "./salesGoals.repo";

function makeSalesGoal(overrides: Partial<SalesGoal>): SalesGoal {
  return {
    id: "goal-1",
    owner_id: "owner-1",
    goal_type: "revenue",
    target_value: 100_000,
    current_value: 0,
    period_month: 1,
    period_year: 2026,
    deal_id: null,
    company_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("normalizeSalesGoal", () => {
  it("coerces target_value and current_value from gateway JSON strings to numbers", () => {
    const goal = makeSalesGoal({
      target_value: "100000" as unknown as number,
      current_value: "42500.5" as unknown as number,
    });
    const result = normalizeSalesGoal(goal);
    expect(result.target_value).toBe(100_000);
    expect(result.current_value).toBe(42_500.5);
  });

  it("defaults missing/invalid numeric fields to 0", () => {
    const goal = makeSalesGoal({
      target_value: null as unknown as number,
      current_value: undefined as unknown as number,
    });
    const result = normalizeSalesGoal(goal);
    expect(result.target_value).toBe(0);
    expect(result.current_value).toBe(0);
  });

  it("leaves other fields untouched", () => {
    const goal = makeSalesGoal({ goal_type: "new_deals" });
    expect(normalizeSalesGoal(goal).goal_type).toBe("new_deals");
  });
});
