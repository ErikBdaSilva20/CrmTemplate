// Metadata e formatação de Sales Goals compartilhadas entre a visão mensal
// (SalesGoalsScreen.tsx) e a Visão Anual (AnnualGoalsGrid.tsx) — extraído
// para evitar duplicar a lista de tipos de meta e a lógica de formatação
// entre os dois.
import { TrendingUp, Handshake, Phone, UserPlus } from "lucide-react";
import type { GoalPaceStatus } from "@/lib/analytics";

export const GOAL_TYPES = [
  { value: "revenue", label: "Receita (R$)", icon: TrendingUp, color: "text-emerald-500" },
  { value: "deals_closed", label: "Deals Fechados", icon: Handshake, color: "text-blue-500" },
  { value: "activities", label: "Atividades", icon: Phone, color: "text-amber-500" },
  { value: "new_contacts", label: "Novos Contatos", icon: UserPlus, color: "text-violet-500" },
];

export function goalTypeInfo(type: string) {
  return GOAL_TYPES.find((gt) => gt.value === type) || GOAL_TYPES[0];
}

export const PACE_STYLES: Record<GoalPaceStatus, { label: string; badge: string }> = {
  achieved: { label: "Atingida", badge: "bg-emerald-500/10 text-emerald-600" },
  on_track: { label: "No ritmo", badge: "bg-primary/10 text-primary" },
  behind: { label: "Atrás", badge: "bg-destructive/10 text-destructive" },
};

// Receita em BRL sem casas decimais; demais tipos (contagens) como inteiro.
export function formatGoalValue(type: string, value: number): string {
  if (type === "revenue") return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  return String(Math.round(value));
}
