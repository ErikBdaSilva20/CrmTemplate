import { describe, it, expect } from "vitest";
import {
  resolvePeriod,
  isInInterval,
  previousInterval,
  getSelectableYears,
  DEFAULT_YEAR_WINDOW,
  type Period,
} from "./period";

describe("resolvePeriod — presets", () => {
  it("this_year always resolves to the full calendar year, regardless of the current day", () => {
    const early = new Date(2026, 0, 5); // 5 Jan 2026
    const late = new Date(2026, 11, 20); // 20 Dec 2026
    const period: Period = { kind: "preset", preset: "this_year" };
    for (const now of [early, late]) {
      const { start, end } = resolvePeriod(period, now);
      expect(start).toEqual(new Date(2026, 0, 1));
      expect(end).toEqual(new Date(2027, 0, 1));
    }
  });

  it("today resolves to a one-day interval", () => {
    const now = new Date(2026, 6, 7, 15, 30);
    const { start, end } = resolvePeriod({ kind: "preset", preset: "today" }, now);
    expect(start).toEqual(new Date(2026, 6, 7));
    expect(end).toEqual(new Date(2026, 6, 8));
  });

  it("this_month resolves to the full calendar month", () => {
    const now = new Date(2026, 6, 20);
    const { start, end } = resolvePeriod({ kind: "preset", preset: "this_month" }, now);
    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 7, 1));
  });

  it("this_quarter resolves to a 3-month block aligned to calendar quarters", () => {
    const now = new Date(2026, 7, 10); // August -> Q3 (Jul-Sep)
    const { start, end } = resolvePeriod({ kind: "preset", preset: "this_quarter" }, now);
    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 9, 1));
  });

  it("this_week resolves to the Monday-Sunday week of the given `now`, with an exclusive end", () => {
    // Regression: getWeekRange's `now` param must actually be threaded
    // through — an earlier version silently used the real current time,
    // which day-of-week-only assertions failed to catch.
    const now = new Date(2026, 6, 8); // Wednesday, 8 Jul 2026
    const { start, end } = resolvePeriod({ kind: "preset", preset: "this_week" }, now);
    expect(start).toEqual(new Date(2026, 6, 6)); // Monday 6 Jul 2026
    expect(end).toEqual(new Date(2026, 6, 13)); // next Monday, exclusive
  });

  it("all resolves to an open interval", () => {
    const { start, end } = resolvePeriod({ kind: "preset", preset: "all" });
    expect(start).toBeNull();
    expect(end).toBeNull();
  });
});

describe("resolvePeriod — absolute periods", () => {
  it("year resolves to the full calendar year", () => {
    const { start, end } = resolvePeriod({ kind: "year", year: 2025 });
    expect(start).toEqual(new Date(2025, 0, 1));
    expect(end).toEqual(new Date(2026, 0, 1));
  });

  it("month resolves to the full calendar month", () => {
    const { start, end } = resolvePeriod({ kind: "month", year: 2025, month: 3 });
    expect(start).toEqual(new Date(2025, 2, 1));
    expect(end).toEqual(new Date(2025, 3, 1));
  });

  it("custom resolves from/to as a day-granularity range with an exclusive end the day after `to`", () => {
    const { start, end } = resolvePeriod({
      kind: "custom",
      from: new Date(2026, 2, 1, 9, 0),
      to: new Date(2026, 2, 15, 18, 0),
    });
    expect(start).toEqual(new Date(2026, 2, 1));
    expect(end).toEqual(new Date(2026, 2, 16));
  });
});

describe("isInInterval", () => {
  const interval = resolvePeriod({ kind: "month", year: 2026, month: 3 });

  it("includes the start boundary (inclusive)", () => {
    expect(isInInterval(new Date(2026, 2, 1), interval)).toBe(true);
  });

  it("excludes the end boundary (exclusive)", () => {
    expect(isInInterval(new Date(2026, 3, 1), interval)).toBe(false);
  });

  it("includes a date strictly inside the interval", () => {
    expect(isInInterval("2026-03-15", interval)).toBe(true);
  });

  it("excludes a date before the interval", () => {
    expect(isInInterval(new Date(2026, 1, 28), interval)).toBe(false);
  });

  it("returns false for a missing value against a bounded interval", () => {
    expect(isInInterval(null, interval)).toBe(false);
    expect(isInInterval(undefined, interval)).toBe(false);
  });

  it("always returns true for an open interval, even with a missing value", () => {
    const open = resolvePeriod({ kind: "preset", preset: "all" });
    expect(isInInterval(null, open)).toBe(true);
    expect(isInInterval("2020-01-01", open)).toBe(true);
  });
});

describe("previousInterval", () => {
  it("today -> the day before", () => {
    const now = new Date(2026, 6, 7);
    const prev = previousInterval({ kind: "preset", preset: "today" }, now);
    expect(prev?.start).toEqual(new Date(2026, 6, 6));
    expect(prev?.end).toEqual(new Date(2026, 6, 7));
  });

  it("this_week -> the previous Monday-Sunday week, anchored to the given `now`", () => {
    const now = new Date(2026, 6, 8); // Wednesday, 8 Jul 2026
    const current = resolvePeriod({ kind: "preset", preset: "this_week" }, now);
    const prev = previousInterval({ kind: "preset", preset: "this_week" }, now);
    expect(prev?.start).toEqual(new Date(2026, 5, 29)); // Monday 29 Jun 2026
    expect(prev?.end).toEqual(current.start);
  });

  it("this_month -> the previous calendar month, including year rollover", () => {
    const now = new Date(2026, 0, 15); // January
    const prev = previousInterval({ kind: "preset", preset: "this_month" }, now);
    expect(prev?.start).toEqual(new Date(2025, 11, 1));
    expect(prev?.end).toEqual(new Date(2026, 0, 1));
  });

  it("this_quarter -> the previous quarter, including year rollover", () => {
    const now = new Date(2026, 1, 10); // Q1
    const prev = previousInterval({ kind: "preset", preset: "this_quarter" }, now);
    expect(prev?.start).toEqual(new Date(2025, 9, 1));
    expect(prev?.end).toEqual(new Date(2026, 0, 1));
  });

  it("this_year -> the previous calendar year (fixes the auditoria gap where this returned 0)", () => {
    const now = new Date(2026, 6, 7);
    const prev = previousInterval({ kind: "preset", preset: "this_year" }, now);
    expect(prev?.start).toEqual(new Date(2025, 0, 1));
    expect(prev?.end).toEqual(new Date(2026, 0, 1));
  });

  it("all -> null (no meaningful previous period)", () => {
    expect(previousInterval({ kind: "preset", preset: "all" })).toBeNull();
  });

  it("year (absolute) -> year - 1", () => {
    const prev = previousInterval({ kind: "year", year: 2025 });
    expect(prev?.start).toEqual(new Date(2024, 0, 1));
    expect(prev?.end).toEqual(new Date(2025, 0, 1));
  });

  it("month (absolute) -> previous month, including year rollover", () => {
    const prev = previousInterval({ kind: "month", year: 2026, month: 1 });
    expect(prev?.start).toEqual(new Date(2025, 11, 1));
    expect(prev?.end).toEqual(new Date(2026, 0, 1));
  });

  it("custom -> an immediately preceding interval of the same duration", () => {
    const period: Period = { kind: "custom", from: new Date(2026, 2, 11), to: new Date(2026, 2, 20) };
    const current = resolvePeriod(period);
    const prev = previousInterval(period);
    expect(prev?.end).toEqual(current.start);
    const currentDuration = (current.end as Date).getTime() - (current.start as Date).getTime();
    const prevDuration = (prev!.end as Date).getTime() - (prev!.start as Date).getTime();
    expect(prevDuration).toBe(currentDuration);
  });
});

describe("getSelectableYears", () => {
  it("returns a fixed window of current-N..current, ascending", () => {
    const now = new Date(2026, 0, 1);
    expect(getSelectableYears(now, 3)).toEqual([2023, 2024, 2025, 2026]);
  });

  it("defaults to a 5-year window", () => {
    const now = new Date(2026, 0, 1);
    expect(getSelectableYears(now)).toHaveLength(DEFAULT_YEAR_WINDOW + 1);
    expect(getSelectableYears(now)[0]).toBe(2021);
  });
});
