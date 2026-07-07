import { describe, it, expect } from "vitest";
import { coerceNumeric, normalizeNumericFields } from "./normalize";

describe("coerceNumeric", () => {
  it("passes through a valid number", () => {
    expect(coerceNumeric(42)).toBe(42);
  });

  it("parses a numeric string (gateway JSON round-trip of Postgres numeric)", () => {
    expect(coerceNumeric("42.5")).toBe(42.5);
  });

  it("defaults to 0 for null/undefined/NaN-producing input", () => {
    expect(coerceNumeric(null)).toBe(0);
    expect(coerceNumeric(undefined)).toBe(0);
    expect(coerceNumeric("not-a-number")).toBe(0);
  });

  it("defaults to 0 for an empty string, not NaN", () => {
    expect(coerceNumeric("")).toBe(0);
  });
});

describe("normalizeNumericFields", () => {
  it("coerces only the listed keys, leaving the rest untouched", () => {
    const row = { id: "1", value: "100.5" as unknown as number, label: "keep me" };
    const result = normalizeNumericFields(row, ["value"]);
    expect(result.value).toBe(100.5);
    expect(result.label).toBe("keep me");
    expect(result.id).toBe("1");
  });

  it("coerces multiple keys in one pass", () => {
    const row = { a: "1" as unknown as number, b: "2" as unknown as number };
    expect(normalizeNumericFields(row, ["a", "b"])).toEqual({ a: 1, b: 2 });
  });

  it("does not mutate the original object", () => {
    const row = { value: "5" as unknown as number };
    normalizeNumericFields(row, ["value"]);
    expect(row.value).toBe("5");
  });
});
