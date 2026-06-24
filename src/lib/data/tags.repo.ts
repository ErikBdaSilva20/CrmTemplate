import { db } from "./client";
import type { Database } from "./types.gen";

// tags = lookup (admin/manager cria). As JOINS contact_tags/deal_tags são escritas
// pelo rep → têm owner_id (gateway seta). Aqui só não mandamos owner_id do front.
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
export type DealTag = Database["public"]["Tables"]["deal_tags"]["Row"];

export const listTags = () => db.table<Tag>("tags").list();
export const createTag = (input: Database["public"]["Tables"]["tags"]["Insert"]) =>
  db.table<Tag>("tags").create(input);
export const deleteTag = (id: string) => db.table<Tag>("tags").remove(id);

// Vínculos (rep): create/remove. owner_id setado pelo gateway.
export const listContactTags = () => db.table<ContactTag>("contact_tags").list();
export const addContactTag = (contactId: string, tagId: string) =>
  db.table<ContactTag>("contact_tags").create({ contact_id: contactId, tag_id: tagId });
export const removeContactTag = (id: string) => db.table<ContactTag>("contact_tags").remove(id);

export const listDealTags = () => db.table<DealTag>("deal_tags").list();
export const addDealTag = (dealId: string, tagId: string) =>
  db.table<DealTag>("deal_tags").create({ deal_id: dealId, tag_id: tagId });
export const removeDealTag = (id: string) => db.table<DealTag>("deal_tags").remove(id);

// Tags de um contato/deal — resolve no front (sem join).
export const tagsForContact = async (contactId: string): Promise<Tag[]> => {
  const [tags, links] = await Promise.all([listTags(), listContactTags()]);
  const ids = new Set(links.filter((l) => l.contact_id === contactId).map((l) => l.tag_id));
  return tags.filter((t) => ids.has(t.id));
};
export const tagsForDeal = async (dealId: string): Promise<Tag[]> => {
  const [tags, links] = await Promise.all([listTags(), listDealTags()]);
  const ids = new Set(links.filter((l) => l.deal_id === dealId).map((l) => l.tag_id));
  return tags.filter((t) => ids.has(t.id));
};
