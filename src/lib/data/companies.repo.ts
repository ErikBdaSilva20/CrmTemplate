import { db } from "./client";
import type { Database } from "./types.gen";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

// owner_id NUNCA é enviado do front — o gateway o seta pela sessão.
export const listCompanies = () => db.table<Company>("companies").list();
export const createCompany = (input: CompanyInsert) => db.table<Company>("companies").create(input);
export const updateCompany = (id: string, patch: CompanyUpdate) =>
  db.table<Company>("companies").update(id, patch);
export const deleteCompany = (id: string) => db.table<Company>("companies").remove(id);

// Sem get-by-id no modo genérico → list-then-find (§B5).
export const getCompany = async (id: string): Promise<Company | null> =>
  (await listCompanies()).find((c) => c.id === id) ?? null;
