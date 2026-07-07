import { describe, it, expect } from "vitest";
import { normalizeCompany } from "./companies.repo";
import type { Company } from "./companies.repo";

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: "company-1",
    owner_id: "owner-1",
    name: "Acme",
    domain: null,
    industry: null,
    size: null,
    revenue: null,
    website: null,
    linkedin_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("normalizeCompany", () => {
  it("coerces revenue from a gateway JSON string to a number", () => {
    const company = makeCompany({ revenue: "50000" as unknown as number });
    expect(normalizeCompany(company).revenue).toBe(50000);
  });

  it("preserves null revenue instead of coercing it to 0 (unlike deals/sales_goals)", () => {
    const company = makeCompany({ revenue: null });
    expect(normalizeCompany(company).revenue).toBeNull();
  });

  it("defaults an invalid non-null revenue to 0", () => {
    const company = makeCompany({ revenue: "not-a-number" as unknown as number });
    expect(normalizeCompany(company).revenue).toBe(0);
  });

  it("leaves other fields untouched", () => {
    const company = makeCompany({ name: "Globex" });
    expect(normalizeCompany(company).name).toBe("Globex");
  });
});
