import { describe, it, expect } from "vitest";
import {
  computePercentage, computeAtRiskDeals,
  computeAverageSalesCycleDays,
  selectTopDeals, dealPriority, buildDealPriorityMap,
  computeGoalActual, computeGoalPace, computeGoalProjection, computeAnnualGoalSummary,
} from "./analytics";
import type { Activity, Contact, Deal, SalesGoal } from "./data";

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: "act-1",
    owner_id: "owner-1",
    type: "note",
    title: "Activity",
    body: null,
    contact_id: null,
    deal_id: null,
    company_id: null,
    due_date: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact>): Contact {
  return {
    id: "contact-1",
    owner_id: "owner-1",
    company_id: null,
    first_name: "Jane",
    last_name: "Doe",
    email: null,
    phone: null,
    title: null,
    linkedin_url: null,
    avatar_url: null,
    status: "lead",
    lead_score: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<SalesGoal>): SalesGoal {
  return {
    id: "goal-1",
    owner_id: "owner-1",
    goal_type: "revenue",
    target_value: 10_000,
    current_value: 0,
    period_month: 6,
    period_year: 2026,
    deal_id: null,
    company_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

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

describe("computePercentage", () => {
  it("rounds to the nearest integer", () => {
    expect(computePercentage(1, 3)).toBe(33);
  });

  it("returns 0 when the denominator is 0 (avoids division by zero)", () => {
    expect(computePercentage(5, 0)).toBe(0);
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

describe("dealPriority", () => {
  const now = new Date(2026, 5, 20);

  it("flags a deal closing this month or overdue as urgent", () => {
    const deal = makeDeal({ close_date: new Date(2026, 5, 1).toISOString(), created_at: now.toISOString() });
    expect(dealPriority(deal, [], now).level).toBe("urgent");
  });

  it("flags a deal with no recent activity as stale", () => {
    const oldCreated = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const deal = makeDeal({ close_date: null, created_at: oldCreated });
    expect(dealPriority(deal, [], now).level).toBe("stale");
  });

  it("uses the most recent activity, not created_at, to compute staleness", () => {
    const oldCreated = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const deal = makeDeal({ id: "d1", close_date: null, created_at: oldCreated });
    const recentActivity = makeActivity({ deal_id: "d1", created_at: new Date(now.getTime() - 1 * 86_400_000).toISOString() });
    expect(dealPriority(deal, [recentActivity], now).level).toBe("none");
  });

  it("flags a high-value deal with low BANT as risk", () => {
    const deal = makeDeal({
      close_date: null,
      created_at: now.toISOString(),
      value: 50_000,
      qualification_score: 25,
    });
    expect(dealPriority(deal, [], now).level).toBe("risk");
  });

  it("does not treat qualification_score 0 (never assessed) as risk", () => {
    const deal = makeDeal({
      close_date: null,
      created_at: now.toISOString(),
      value: 50_000,
      qualification_score: 0,
    });
    expect(dealPriority(deal, [], now).level).toBe("none");
  });

  it("prioritizes urgent over stale and risk when multiple reasons apply", () => {
    const oldCreated = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const deal = makeDeal({
      close_date: new Date(2026, 4, 1).toISOString(),
      created_at: oldCreated,
      value: 50_000,
      qualification_score: 25,
    });
    const result = dealPriority(deal, [], now);
    expect(result.level).toBe("urgent");
    expect(result.reasons).toEqual(expect.arrayContaining(["urgent", "stale", "risk"]));
  });
});

describe("buildDealPriorityMap", () => {
  const now = new Date(2026, 5, 20);

  it("matches dealPriority per-deal for a mixed batch", () => {
    const oldCreated = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const urgentDeal = makeDeal({ id: "urgent", close_date: new Date(2026, 5, 1).toISOString(), created_at: now.toISOString() });
    const staleDeal = makeDeal({ id: "stale", close_date: null, created_at: oldCreated });
    const okDeal = makeDeal({ id: "ok", close_date: null, created_at: now.toISOString() });
    const deals = [urgentDeal, staleDeal, okDeal];
    const activities = [makeActivity({ deal_id: "ok", created_at: now.toISOString() })];

    const map = buildDealPriorityMap(deals, activities, now);

    for (const deal of deals) {
      expect(map.get(deal.id)).toEqual(dealPriority(deal, activities, now));
    }
  });

  it("ignores activities belonging to other deals when scoring staleness", () => {
    const oldCreated = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const deal = makeDeal({ id: "d1", close_date: null, created_at: oldCreated });
    // Atividade recente, mas de outro deal — não deve "salvar" d1 da staleness.
    const otherActivity = makeActivity({ deal_id: "d2", created_at: now.toISOString() });

    const map = buildDealPriorityMap([deal], [otherActivity], now);

    expect(map.get("d1")?.level).toBe("stale");
  });

  it("returns an empty map for an empty deal list", () => {
    expect(buildDealPriorityMap([], [], now).size).toBe(0);
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

describe("computeGoalActual", () => {
  const month = 6;
  const year = 2026;
  const inPeriod = new Date(2026, 5, 10).toISOString();
  const outOfPeriod = new Date(2026, 4, 10).toISOString();

  it("global revenue goal sums won deals in period regardless of company", () => {
    const goal = makeGoal({ goal_type: "revenue" });
    const deals = [
      makeDeal({ id: "d1", status: "won", value: 100, updated_at: inPeriod }),
      makeDeal({ id: "d2", status: "won", value: 200, updated_at: outOfPeriod }),
      makeDeal({ id: "d3", status: "open", value: 999, updated_at: inPeriod }),
    ];
    expect(computeGoalActual(goal, deals, [], [], month, year)).toBe(100);
  });

  it("company-scoped revenue goal only counts that company's won deals", () => {
    const goal = makeGoal({ goal_type: "revenue", company_id: "co-1" });
    const deals = [
      makeDeal({ id: "d1", company_id: "co-1", status: "won", value: 100, updated_at: inPeriod }),
      makeDeal({ id: "d2", company_id: "co-2", status: "won", value: 500, updated_at: inPeriod }),
    ];
    expect(computeGoalActual(goal, deals, [], [], month, year)).toBe(100);
  });

  it("deal-scoped revenue goal measures just that deal (won only)", () => {
    const wonDeal = makeGoal({ goal_type: "revenue", deal_id: "d1" });
    const deals = [makeDeal({ id: "d1", status: "won", value: 750 })];
    expect(computeGoalActual(wonDeal, deals, [], [], month, year)).toBe(750);

    const openDeal = makeDeal({ id: "d1", status: "open", value: 750 });
    expect(computeGoalActual(wonDeal, [openDeal], [], [], month, year)).toBe(0);
  });

  it("company-scoped new_contacts goal counts contacts created in period for that company", () => {
    const goal = makeGoal({ goal_type: "new_contacts", company_id: "co-1" });
    const contacts = [
      makeContact({ id: "c1", company_id: "co-1", created_at: inPeriod }),
      makeContact({ id: "c2", company_id: "co-2", created_at: inPeriod }),
      makeContact({ id: "c3", company_id: "co-1", created_at: outOfPeriod }),
    ];
    expect(computeGoalActual(goal, [], [], contacts, month, year)).toBe(1);
  });
});

describe("computeGoalPace", () => {
  it("returns 'achieved' once percent reaches 100, regardless of elapsed time", () => {
    expect(computeGoalPace(100, 6, 2026, new Date(2026, 5, 1))).toBe("achieved");
  });

  it("returns 'on_track' when progress keeps up with elapsed period", () => {
    // June has 30 days; day 15 is 50% elapsed.
    const now = new Date(2026, 5, 16);
    expect(computeGoalPace(60, 6, 2026, now)).toBe("on_track");
  });

  it("returns 'behind' when progress lags the elapsed period", () => {
    const now = new Date(2026, 5, 16);
    expect(computeGoalPace(10, 6, 2026, now)).toBe("behind");
  });
});

describe("computeGoalProjection", () => {
  it("projects linearly based on elapsed fraction of the period", () => {
    // Exactly half of June elapsed -> double the current value.
    const now = new Date(2026, 5, 16);
    expect(computeGoalProjection(500, 6, 2026, now)).toBeCloseTo(1000, -1);
  });

  it("returns the current value when no time has elapsed", () => {
    const now = new Date(2026, 5, 1);
    expect(computeGoalProjection(500, 6, 2026, now)).toBe(500);
  });
});

describe("computeAnnualGoalSummary", () => {
  const now = new Date(2026, 11, 31); // year fully elapsed, so pace math doesn't interfere

  it("returns 12 points, distinguishing 'no goal registered' from 'goal registered with target 0'", () => {
    const goals = [
      makeGoal({ id: "g-jan", period_month: 1, period_year: 2026, target_value: 0 }),
    ];
    const points = computeAnnualGoalSummary(goals, [], [], [], 2026, now);
    expect(points).toHaveLength(12);

    const jan = points[0];
    expect(jan.hasGoal).toBe(true);
    expect(jan.target).toBe(0);
    expect(jan.pace).not.toBeNull();

    const feb = points[1];
    expect(feb.hasGoal).toBe(false);
    expect(feb.pace).toBeNull();
  });

  it("sums target and actual across multiple goals of the same type in the same month", () => {
    const globalGoal = makeGoal({ id: "g1", period_month: 3, period_year: 2026, target_value: 1000 });
    const dealGoal = makeGoal({ id: "g2", period_month: 3, period_year: 2026, target_value: 500, deal_id: "d1" });
    const wonGlobal = makeDeal({ id: "d-global", status: "won", value: 200, updated_at: new Date(2026, 2, 10).toISOString() });
    const wonLinkedDeal = makeDeal({ id: "d1", status: "won", value: 500 });

    const points = computeAnnualGoalSummary([globalGoal, dealGoal], [wonGlobal, wonLinkedDeal], [], [], 2026, now);
    const march = points[2];
    expect(march.target).toBe(1500);
    expect(march.actual).toBe(700); // 200 (global scope) + 500 (deal-scoped)
  });

  it("computes month-over-month variation, null in January and when the previous month had no actual", () => {
    const janGoal = makeGoal({ id: "g-jan", period_month: 1, period_year: 2026, target_value: 100 });
    const febGoal = makeGoal({ id: "g-feb", period_month: 2, period_year: 2026, target_value: 100 });
    const marGoal = makeGoal({ id: "g-mar", period_month: 3, period_year: 2026, target_value: 100 });

    const wonFeb = makeDeal({ status: "won", value: 100, updated_at: new Date(2026, 1, 10).toISOString() });
    const wonMar = makeDeal({ status: "won", value: 150, updated_at: new Date(2026, 2, 10).toISOString() });

    const points = computeAnnualGoalSummary([janGoal, febGoal, marGoal], [wonFeb, wonMar], [], [], 2026, now);

    expect(points[0].momVariation).toBeNull(); // January: no previous month
    expect(points[1].momVariation).toBeNull(); // February: previous (January) actual was 0
    expect(points[2].momVariation).toBe(50); // March: 150 vs 100 = +50%
  });

  it("agrees with computeGoalActual for the same month (parity — no reimplementation of the calculation)", () => {
    const goal = makeGoal({ id: "g1", period_month: 5, period_year: 2026, target_value: 1000 });
    const deals = [makeDeal({ status: "won", value: 777, updated_at: new Date(2026, 4, 15).toISOString() })];

    const points = computeAnnualGoalSummary([goal], deals, [], [], 2026, now);
    const direct = computeGoalActual(goal, deals, [], [], 5, 2026);
    expect(points[4].actual).toBe(direct);
  });
});
