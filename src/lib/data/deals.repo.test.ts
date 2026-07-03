import { describe, it, expect } from "vitest";
import { enrichDeals } from "./deals.repo";
import type { Deal } from "./deals.repo";
import type { Contact } from "./contacts.repo";
import type { Company } from "./companies.repo";

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

// Modo genérico não faz join (Importantdoc §B5) — enrichDeals é o cruzamento
// no front que substitui isso. Cobrimos aqui porque é lógica pura e crítica:
// um bug silencioso quebraria contact/company em toda tela que lista deals.
describe("enrichDeals", () => {
  it("attaches the matching contact and company by id", () => {
    const contact = makeContact({ id: "c1" });
    const company = makeCompany({ id: "co1" });
    const deal = makeDeal({ contact_id: "c1", company_id: "co1" });

    const [enriched] = enrichDeals([deal], [contact], [company]);
    expect(enriched.contact?.id).toBe("c1");
    expect(enriched.company?.id).toBe("co1");
  });

  it("sets contact/company to null when there is no reference or no match", () => {
    const deal = makeDeal({ contact_id: "missing", company_id: null });
    const [enriched] = enrichDeals([deal], [], []);
    expect(enriched.contact).toBeNull();
    expect(enriched.company).toBeNull();
  });
});
