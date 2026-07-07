import { describe, it, expect } from "vitest";
import { resolvePeriod } from "./period";
import { filterByInterval, enumerateMonths, aggregateByMonth } from "./periodAggregation";

interface Item {
  id: string;
  date: string | null;
  value: number;
}

const items: Item[] = [
  { id: "a", date: "2026-01-15", value: 100 },
  { id: "b", date: "2026-02-01", value: 50 },
  { id: "c", date: "2026-02-28", value: 25 },
  { id: "d", date: "2026-06-10", value: 10 },
  { id: "e", date: null, value: 999 },
];

describe("filterByInterval", () => {
  it("keeps only items inside the interval (start-inclusive, end-exclusive)", () => {
    const interval = resolvePeriod({ kind: "month", year: 2026, month: 2 });
    const result = filterByInterval(items, interval, (i) => i.date);
    expect(result.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("excludes items with a missing date field against a bounded interval", () => {
    const interval = resolvePeriod({ kind: "year", year: 2026 });
    const result = filterByInterval(items, interval, (i) => i.date);
    expect(result.find((i) => i.id === "e")).toBeUndefined();
  });

  it("keeps everything, including missing dates, for an open interval", () => {
    const open = resolvePeriod({ kind: "preset", preset: "all" });
    const result = filterByInterval(items, open, (i) => i.date);
    expect(result).toHaveLength(items.length);
  });
});

describe("enumerateMonths", () => {
  it("returns 12 months for a full calendar year interval", () => {
    const interval = resolvePeriod({ kind: "year", year: 2026 });
    const months = enumerateMonths(interval);
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ year: 2026, month: 1, label: "Jan" });
    expect(months[11]).toMatchObject({ year: 2026, month: 12, label: "Dez" });
  });

  it("returns the exact months covered by a partial custom interval", () => {
    const interval = resolvePeriod({ kind: "custom", from: new Date(2026, 1, 20), to: new Date(2026, 3, 5) });
    const months = enumerateMonths(interval);
    expect(months.map((m) => m.month)).toEqual([2, 3, 4]);
  });

  it("returns an empty array for an open interval", () => {
    const open = resolvePeriod({ kind: "preset", preset: "all" });
    expect(enumerateMonths(open)).toEqual([]);
  });
});

describe("aggregateByMonth", () => {
  it("sums the metric per month, matching the equivalent direct sum over the full interval (parity)", () => {
    const interval = resolvePeriod({ kind: "year", year: 2026 });
    const sum = (group: Item[]) => group.reduce((acc, i) => acc + i.value, 0);
    const points = aggregateByMonth(items, interval, (i) => i.date, sum);

    expect(points).toHaveLength(12);
    expect(points.find((p) => p.month.month === 1)?.value).toBe(100);
    expect(points.find((p) => p.month.month === 2)?.value).toBe(75);
    expect(points.find((p) => p.month.month === 6)?.value).toBe(10);
    expect(points.find((p) => p.month.month === 3)?.value).toBe(0);

    const totalFromMonths = points.reduce((acc, p) => acc + p.value, 0);
    const totalDirect = sum(filterByInterval(items, interval, (i) => i.date));
    expect(totalFromMonths).toBe(totalDirect);
  });

  it("works with a count metric, not just sums", () => {
    const interval = resolvePeriod({ kind: "year", year: 2026 });
    const points = aggregateByMonth(items, interval, (i) => i.date, (group) => group.length);
    expect(points.find((p) => p.month.month === 2)?.value).toBe(2);
  });
});
