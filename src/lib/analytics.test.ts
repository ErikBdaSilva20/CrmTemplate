import { describe, it, expect } from "vitest";
import {
  computePercentage, getPeriodStart, computeFunnel, computeAtRiskDeals,
  computeMonthlyRevenue, computePreviousPeriodRevenue, computeAverageSalesCycleDays,
  computeStageDeals, selectTopDeals,
} from "./analytics";
import type { Deal, PipelineStage } from "./data";

function makeDeal(overrides: Partial<Deal>): Deal {
  return {
    id: "deal-1",
    owner_id: "owner-1",
    title: "Deal",
    value: 1000,
    currency: "BRL",
    stage_id: null,
    contact_id: null,
    company_id: null,
    close_date: null,
    probability: 50,
    status: "open",
    loss_reason: null,
    qualification: {
      budget: null, authority: null, need: null, timeline: null,
      budget_notes: "", authority_notes: "", need_notes: "", timeline_notes: "",
    },
    qualification_score: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

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

describe("computePercentage", () => {
  it("rounds to the nearest integer", () => {
    expect(computePercentage(1, 3)).toBe(33);
  });

  it("returns 0 when the denominator is 0 (avoids division by zero)", () => {
    expect(computePercentage(5, 0)).toBe(0);
  });
});

describe("getPeriodStart", () => {
  it("returns null for 'all' (no lower bound)", () => {
    expect(getPeriodStart("all")).toBeNull();
  });

  it("returns the 1st of the current month for 'this_month'", () => {
    const now = new Date(2026, 5, 20);
    const start = getPeriodStart("this_month", now);
    expect(start?.getDate()).toBe(1);
    expect(start?.getMonth()).toBe(5);
  });
});

describe("computeFunnel", () => {
  it("sorts stages by sort_order and sums open deal values per stage", () => {
    const stages = [
      makeStage({ id: "s2", sort_order: 1, name: "Proposal" }),
      makeStage({ id: "s1", sort_order: 0, name: "Lead" }),
    ];
    const deals = [
      makeDeal({ id: "d1", stage_id: "s1", value: 100 }),
      makeDeal({ id: "d2", stage_id: "s1", value: 200 }),
      makeDeal({ id: "d3", stage_id: "s2", value: 50 }),
    ];
    const funnel = computeFunnel(stages, deals);
    expect(funnel.map((f) => f.name)).toEqual(["Lead", "Proposal"]);
    expect(funnel[0]).toMatchObject({ id: "s1", count: 2, value: 300 });
    expect(funnel[1]).toMatchObject({ id: "s2", count: 1, value: 50 });
  });
});

describe("computeStageDeals", () => {
  it("filters deals by stage and sorts by value descending", () => {
    const deals = [
      makeDeal({ id: "d1", stage_id: "s1", value: 100 }),
      makeDeal({ id: "d2", stage_id: "s1", value: 300 }),
      makeDeal({ id: "d3", stage_id: "s2", value: 999 }),
    ];
    const result = computeStageDeals(deals, "s1");
    expect(result.map((d) => d.id)).toEqual(["d2", "d1"]);
  });

  it("returns an empty array when the stage has no deals", () => {
    const deals = [makeDeal({ id: "d1", stage_id: "s1", value: 100 })];
    expect(computeStageDeals(deals, "s2")).toEqual([]);
  });
});

describe("selectTopDeals", () => {
  it("sorts by qualification_score desc, then value desc, then close_date asc", () => {
    const deals = [
      makeDeal({ id: "low-score", qualification_score: 25, value: 999, close_date: "2026-01-01" }),
      makeDeal({ id: "high-score-far", qualification_score: 75, value: 100, close_date: "2026-06-01" }),
      makeDeal({ id: "high-score-near", qualification_score: 75, value: 100, close_date: "2026-02-01" }),
      makeDeal({ id: "high-score-more-value", qualification_score: 75, value: 500, close_date: "2026-03-01" }),
    ];
    const result = selectTopDeals(deals);
    expect(result.map((d) => d.id)).toEqual([
      "high-score-more-value",
      "high-score-near",
      "high-score-far",
      "low-score",
    ]);
  });

  it("caps at the given limit (default 4)", () => {
    const deals = Array.from({ length: 6 }, (_, i) => makeDeal({ id: `d${i}`, value: i }));
    expect(selectTopDeals(deals)).toHaveLength(4);
    expect(selectTopDeals(deals, 2)).toHaveLength(2);
  });

  it("sorts deals without a close_date after deals with one, when score and value tie", () => {
    const deals = [
      makeDeal({ id: "no-date", qualification_score: 50, value: 100, close_date: null }),
      makeDeal({ id: "has-date", qualification_score: 50, value: 100, close_date: "2026-01-01" }),
    ];
    expect(selectTopDeals(deals).map((d) => d.id)).toEqual(["has-date", "no-date"]);
  });
});

describe("computeAtRiskDeals", () => {
  const now = new Date(2026, 5, 20);

  it("flags open deals untouched for 14+ days as inactive, ranked by value", () => {
    const stale = new Date(now.getTime() - 20 * 86_400_000).toISOString();
    const fresh = new Date(now.getTime() - 1 * 86_400_000).toISOString();
    const deals = [
      makeDeal({ id: "d1", value: 100, updated_at: stale }),
      makeDeal({ id: "d2", value: 500, updated_at: stale }),
      makeDeal({ id: "d3", value: 999, updated_at: fresh }),
    ];
    const { inactive } = computeAtRiskDeals(deals, now);
    expect(inactive.map((d) => d.id)).toEqual(["d2", "d1"]);
  });

  it("flags open deals closing within 7 days with <50% probability", () => {
    const soon = new Date(now.getTime() + 3 * 86_400_000).toISOString();
    const far = new Date(now.getTime() + 30 * 86_400_000).toISOString();
    const deals = [
      makeDeal({ id: "d1", close_date: soon, probability: 30, updated_at: now.toISOString() }),
      makeDeal({ id: "d2", close_date: soon, probability: 80, updated_at: now.toISOString() }),
      makeDeal({ id: "d3", close_date: far, probability: 10, updated_at: now.toISOString() }),
    ];
    const { closingSoon } = computeAtRiskDeals(deals, now);
    expect(closingSoon.map((d) => d.id)).toEqual(["d1"]);
  });
});

describe("computeMonthlyRevenue", () => {
  it("returns 12 points and sums won revenue for the matching month", () => {
    const now = new Date(2026, 5, 15);
    const wonThisMonth = makeDeal({ status: "won", value: 300, created_at: new Date(2026, 5, 1).toISOString() });
    const points = computeMonthlyRevenue([wonThisMonth], now);
    expect(points).toHaveLength(12);
    expect(points[11].receita).toBe(300);
  });

  it("ignores deals that are not won", () => {
    const now = new Date(2026, 5, 15);
    const openDeal = makeDeal({ status: "open", value: 500, created_at: new Date(2026, 5, 1).toISOString() });
    const points = computeMonthlyRevenue([openDeal], now);
    expect(points[11].receita).toBe(0);
  });
});

describe("computePreviousPeriodRevenue", () => {
  it("sums won revenue in the prior calendar month for 'this_month'", () => {
    const now = new Date(2026, 5, 15);
    const wonLastMonth = makeDeal({ status: "won", value: 400, created_at: new Date(2026, 4, 10).toISOString() });
    const wonThisMonth = makeDeal({ status: "won", value: 999, created_at: new Date(2026, 5, 10).toISOString() });
    expect(computePreviousPeriodRevenue([wonLastMonth, wonThisMonth], "this_month", now)).toBe(400);
  });

  it("returns 0 for periods without a defined prior range (e.g. 'all')", () => {
    expect(computePreviousPeriodRevenue([], "all", new Date())).toBe(0);
  });
});

describe("computeAverageSalesCycleDays", () => {
  it("averages days between created_at and updated_at across won deals", () => {
    const created = new Date(2026, 0, 1).toISOString();
    const updated10 = new Date(2026, 0, 11).toISOString();
    const updated20 = new Date(2026, 0, 21).toISOString();
    const deals = [
      makeDeal({ created_at: created, updated_at: updated10 }),
      makeDeal({ created_at: created, updated_at: updated20 }),
    ];
    expect(computeAverageSalesCycleDays(deals)).toBe(15);
  });

  it("returns 0 for an empty list", () => {
    expect(computeAverageSalesCycleDays([])).toBe(0);
  });
});
