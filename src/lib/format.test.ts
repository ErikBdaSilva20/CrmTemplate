import { describe, it, expect } from "vitest";
import {
  formatCurrency, formatCurrencyCompact,
  formatDate, formatDateTime, formatDateShort, formatMonthYear,
  daysAgo, monthsUntil,
} from "./format";

describe("formatCurrency", () => {
  it("formats BRL by default", () => {
    expect(formatCurrency(1234.5)).toBe("R$ 1.234,50");
  });

  it("respects an explicit currency code", () => {
    expect(formatCurrency(10, "USD")).toContain("10,00");
  });
});

describe("formatCurrencyCompact", () => {
  it("drops decimal digits", () => {
    expect(formatCurrencyCompact(1234.5)).toBe("R$ 1.235");
  });
});

describe("date formatters — null/undefined handling", () => {
  it.each([formatDate, formatDateTime, formatDateShort, formatMonthYear])(
    "returns the em-dash placeholder for null and undefined",
    (formatter) => {
      expect(formatter(null)).toBe("—");
      expect(formatter(undefined)).toBe("—");
    },
  );
});

describe("formatDate", () => {
  it("formats a date string as pt-BR dd/mm/yyyy", () => {
    expect(formatDate("2026-03-05T00:00:00")).toBe("05/03/2026");
  });
});

describe("daysAgo", () => {
  it("returns 0 for a falsy date", () => {
    expect(daysAgo(null)).toBe(0);
    expect(daysAgo(undefined)).toBe(0);
  });

  it("returns 0 for the same instant", () => {
    const now = new Date(2026, 5, 20, 12, 0, 0);
    expect(daysAgo(now, now)).toBe(0);
  });

  it("floors the whole-day distance between date and now", () => {
    const now = new Date(2026, 5, 20, 12, 0, 0);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000);
    expect(daysAgo(tenDaysAgo, now)).toBe(10);
  });

  it("does not round a partial day up", () => {
    const now = new Date(2026, 5, 20, 12, 0, 0);
    const almostTwoDaysAgo = new Date(now.getTime() - (2 * 86_400_000 - 1000));
    expect(daysAgo(almostTwoDaysAgo, now)).toBe(1);
  });
});

describe("monthsUntil", () => {
  it("returns 0 for a falsy date", () => {
    expect(monthsUntil(null)).toBe(0);
    expect(monthsUntil(undefined)).toBe(0);
  });

  it("returns 0 for the current calendar month, regardless of day", () => {
    const now = new Date(2026, 5, 20);
    expect(monthsUntil(new Date(2026, 5, 1), now)).toBe(0);
    expect(monthsUntil(new Date(2026, 5, 28), now)).toBe(0);
  });

  it("counts whole calendar months forward", () => {
    const now = new Date(2026, 5, 20);
    expect(monthsUntil(new Date(2026, 8, 1), now)).toBe(3);
  });

  it("counts whole calendar months backward as negative (overdue)", () => {
    const now = new Date(2026, 5, 20);
    expect(monthsUntil(new Date(2026, 2, 1), now)).toBe(-3);
  });

  it("crosses a year boundary correctly", () => {
    const now = new Date(2026, 10, 15); // Nov 2026
    expect(monthsUntil(new Date(2027, 1, 1), now)).toBe(3); // Feb 2027
  });
});
