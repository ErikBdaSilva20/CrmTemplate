import { db } from "./client";
import type { Database } from "./types.gen";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

// `revenue` is Postgres `numeric`, nullable — can arrive as a string over the
// gateway's JSON despite the generated `number | null` type. Normalize once
// here (see Masia Clone-Template Audit Framework §7).
function normalizeCompany(c: Company): Company {
  return { ...c, revenue: c.revenue == null ? null : Number(c.revenue) || 0 };
}

// owner_id NUNCA é enviado do front — o gateway o seta pela sessão.
export const listCompanies = async () =>
  (await db.table<Company>("companies").list()).map(normalizeCompany);
export const createCompany = async (input: CompanyInsert) =>
  normalizeCompany(await db.table<Company>("companies").create(input));
export const updateCompany = async (id: string, patch: CompanyUpdate) =>
  normalizeCompany(await db.table<Company>("companies").update(id, patch));
export const deleteCompany = (id: string) => db.table<Company>("companies").remove(id);

// Sem get-by-id no modo genérico → list-then-find (§B5).
export const getCompany = async (id: string): Promise<Company | null> =>
  (await listCompanies()).find((c) => c.id === id) ?? null;
