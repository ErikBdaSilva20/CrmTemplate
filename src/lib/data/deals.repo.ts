import { db } from "./client";
import type { Database } from "./types.gen";
import type { Contact } from "./contacts.repo";
import type { Company } from "./companies.repo";

export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];
export type DealUpdate = Database["public"]["Tables"]["deals"]["Update"];

// Deal "enriquecido" no front (não há join no modo genérico).
export type DealWithRelations = Deal & {
  contact?: Contact | null;
  company?: Company | null;
};

// Postgres `numeric` columns (value, probability) can round-trip through the
// gateway's JSON serialization as strings even though types.gen.ts declares
// them as `number` — normalize once here instead of every call site doing
// `Number(deal.value) || 0` (see Masia Clone-Template Audit Framework §7).
function normalizeDeal(d: Deal): Deal {
  return { ...d, value: Number(d.value) || 0, probability: Number(d.probability) || 0 };
}

export const listDeals = async () => (await db.table<Deal>("deals").list()).map(normalizeDeal);
export const createDeal = async (input: DealInsert) =>
  normalizeDeal(await db.table<Deal>("deals").create(input));
export const updateDeal = async (id: string, patch: DealUpdate) =>
  normalizeDeal(await db.table<Deal>("deals").update(id, patch));
export const deleteDeal = (id: string) => db.table<Deal>("deals").remove(id);

export const getDeal = async (id: string): Promise<Deal | null> =>
  (await listDeals()).find((d) => d.id === id) ?? null;

// Mover card no Kanban = só troca o stage_id.
export const moveDealToStage = (id: string, stageId: string) =>
  updateDeal(id, { stage_id: stageId });

export const markDealWon = (id: string) => updateDeal(id, { status: "won", loss_reason: null });
export const markDealLost = (id: string, lossReason: string) =>
  updateDeal(id, { status: "lost", loss_reason: lossReason });

// Cruza deals + contacts + companies no front (substitui o join do Supabase).
export function enrichDeals(
  deals: Deal[],
  contacts: Contact[],
  companies: Company[],
): DealWithRelations[] {
  const cById = new Map(contacts.map((c) => [c.id, c]));
  const coById = new Map(companies.map((c) => [c.id, c]));
  return deals.map((d) => ({
    ...d,
    contact: d.contact_id ? cById.get(d.contact_id) ?? null : null,
    company: d.company_id ? coById.get(d.company_id) ?? null : null,
  }));
}
