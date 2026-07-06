// Barrel dos repos — import único nas telas: import { listDeals, ... } from "@/lib/data";

// Tipos de domínio do schema (enums + JSON) — para as telas tiparem sem importar
// direto de types.gen (arquivo protegido).
export type {
  ContactStatus, DealStatus, ActivityType, DealQualification, Json,
} from "./types.gen";

export * from "./companies.repo";
export * from "./contacts.repo";
export * from "./deals.repo";
export * from "./activities.repo";
export * from "./pipelines.repo";
export * from "./tags.repo";
export * from "./lookups.repo";
export * from "./salesGoals.repo";

