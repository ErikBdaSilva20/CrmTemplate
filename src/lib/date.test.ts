import { describe, it, expect } from "vitest";
import { startOfDay, endOfDay, getWeekRange, toLocalDateKey } from "./date";

describe("startOfDay / endOfDay", () => {
  it("zeroes out the time portion", () => {
    const d = new Date(2026, 5, 15, 22, 45, 30);
    const start = startOfDay(d);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(15);
  });

  it("keeps end of day at 23:59:59.999", () => {
    const d = new Date(2026, 5, 15, 8, 0, 0);
    const end = endOfDay(d);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});

describe("getWeekRange", () => {
  it("returns a Monday-to-Sunday range", () => {
    const { start, end } = getWeekRange(0);
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(end.getTime() - start.getTime()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000 - 1000);
  });

  it("shifts by offsetWeeks", () => {
    const thisWeek = getWeekRange(0);
    const nextWeek = getWeekRange(1);
    const diffDays = Math.round((nextWeek.start.getTime() - thisWeek.start.getTime()) / 86_400_000);
    expect(diffDays).toBe(7);
  });
});

describe("toLocalDateKey", () => {
  it("formats using local date parts, not UTC", () => {
    // 22:00 local time must stay on the same calendar day — this is the bug
    // fixed in AUDITORIA-CODIGO.md §5.1 (toISOString() shifted it to UTC).
    const lateNight = new Date(2026, 2, 10, 22, 0, 0);
    expect(toLocalDateKey(lateNight)).toBe("2026-03-10");
  });

  it("pads month and day to two digits", () => {
    const earlyDate = new Date(2026, 0, 5);
    expect(toLocalDateKey(earlyDate)).toBe("2026-01-05");
  });
});
