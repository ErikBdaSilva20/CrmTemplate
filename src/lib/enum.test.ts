import { describe, it, expect } from "vitest";
import { coerceEnumValue } from "./enum";

const STATUSES = ["lead", "prospect", "customer", "churned"] as const;

describe("coerceEnumValue", () => {
  it("returns the value unchanged when it matches exactly", () => {
    expect(coerceEnumValue("lead", STATUSES)).toBe("lead");
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(coerceEnumValue(" Lead ", STATUSES)).toBe("lead");
    expect(coerceEnumValue("CUSTOMER", STATUSES)).toBe("customer");
  });

  it("returns null for a value outside the enum", () => {
    expect(coerceEnumValue("ativo", STATUSES)).toBeNull();
  });

  it("returns null for empty, null or undefined input", () => {
    expect(coerceEnumValue("", STATUSES)).toBeNull();
    expect(coerceEnumValue(null, STATUSES)).toBeNull();
    expect(coerceEnumValue(undefined, STATUSES)).toBeNull();
  });
});
