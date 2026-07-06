// Checklist de pré-requisitos estruturais do CRM — função pura, sem
// chamadas a `db`. Existe pra que o usuário nunca mais "se perca" do jeito
// que aconteceu com /deals: 3 negócios ativos ficaram invisíveis porque não
// havia nenhum pipeline/estágio cadastrado, e depois da remoção de
// /settings (fix-epic 08) não sobrou nenhuma tela óbvia pra notar ou
// resolver isso. `SystemRequirementsWidget` usa esta lista pra mostrar o
// que falta e, quando possível, resolver ali mesmo.
import type { Company, LossReason, Pipeline, PipelineStage } from "@/lib/data";

export type RequirementSeverity = "blocking" | "recommended";

export interface SystemRequirement {
  id: "pipeline" | "loss_reason" | "company";
  label: string;
  met: boolean;
  severity: RequirementSeverity;
  description: string;
}

export interface SystemRequirementsInput {
  pipelines: Pipeline[];
  stages: PipelineStage[];
  lossReasons: LossReason[];
  companies: Company[];
}

export function computeSystemRequirements(input: SystemRequirementsInput): SystemRequirement[] {
  return [
    {
      id: "pipeline",
      label: "Pipeline de vendas",
      met: input.pipelines.length > 0 && input.stages.length > 0,
      severity: "blocking",
      description: "Sem pipeline com pelo menos um estágio, negócios abertos não aparecem no Kanban de /deals.",
    },
    {
      id: "loss_reason",
      label: "Motivo de perda",
      met: input.lossReasons.length > 0,
      severity: "blocking",
      description: "Sem nenhum motivo cadastrado, não dá pra marcar um negócio como perdido.",
    },
    {
      id: "company",
      label: "Empresa cadastrada",
      met: input.companies.length > 0,
      severity: "recommended",
      description: "Contatos e negócios ficam mais completos quando vinculados a uma empresa.",
    },
  ];
}
