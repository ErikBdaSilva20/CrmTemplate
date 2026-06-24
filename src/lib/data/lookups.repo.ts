import { db } from "./client";
import type { Database } from "./types.gen";

// Lookups de configuração (sem owner_id): admin/manager escreve, rep lê.
export type LossReason = Database["public"]["Tables"]["loss_reasons"]["Row"];

export const listLossReasons = () => db.table<LossReason>("loss_reasons").list();
export const createLossReason = (input: Database["public"]["Tables"]["loss_reasons"]["Insert"]) =>
  db.table<LossReason>("loss_reasons").create(input);
export const updateLossReason = (
  id: string,
  patch: Database["public"]["Tables"]["loss_reasons"]["Update"],
) => db.table<LossReason>("loss_reasons").update(id, patch);
export const deleteLossReason = (id: string) => db.table<LossReason>("loss_reasons").remove(id);
