import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClipboardCheck, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth, roleAtLeast } from "@/lib/auth";
import { usePipelines, useStages, invalidatePipelines, invalidateStages } from "@/hooks/usePipelines";
import { useLossReasons, invalidateLossReasons } from "@/hooks/useLossReasons";
import { useCompanies } from "@/hooks/useCompanies";
import { createDefaultPipeline, createLossReason } from "@/lib/data";
import { computeSystemRequirements, type SystemRequirement } from "@/lib/systemRequirements";

// Botão colapsável (não um banner fixo) presente no header em todas as
// telas — evita que uma pendência estrutural (ex.: nenhum pipeline
// cadastrado) fique invisível como aconteceu em /deals. Fechado por padrão;
// só ocupa espaço quando o usuário clica.
export function SystemRequirementsWidget() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = roleAtLeast(role, "manager");

  const { data: pipelines } = usePipelines();
  const { data: stages, refresh: refreshStages } = useStages();
  const { data: lossReasons, refresh: refreshLossReasons } = useLossReasons();
  const { data: companies } = useCompanies();

  const [open, setOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState("Pipeline de Vendas");
  const [lossReasonLabel, setLossReasonLabel] = useState("");
  const [saving, setSaving] = useState<SystemRequirement["id"] | null>(null);

  const requirements = computeSystemRequirements({ pipelines, stages, lossReasons, companies });
  const pendingBlocking = requirements.filter((r) => !r.met && r.severity === "blocking").length;

  const fixPipeline = async () => {
    if (!pipelineName.trim()) return;
    setSaving("pipeline");
    try {
      await createDefaultPipeline(pipelineName.trim());
      invalidatePipelines();
      invalidateStages();
      refreshStages();
      toast.success("Pipeline criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar pipeline");
    } finally {
      setSaving(null);
    }
  };

  const fixLossReason = async () => {
    if (!lossReasonLabel.trim()) return;
    setSaving("loss_reason");
    try {
      await createLossReason({ label: lossReasonLabel.trim() });
      invalidateLossReasons();
      refreshLossReasons();
      setLossReasonLabel("");
      toast.success("Motivo de perda criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar motivo");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Checklist de configuração do sistema"
        >
          <ClipboardCheck className="h-4 w-4" />
          {pendingBlocking > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {pendingBlocking}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-semibold">Configuração do sistema</p>
          <p className="text-[11px] text-muted-foreground">
            O que falta pra cada parte do CRM funcionar de ponta a ponta.
          </p>
        </div>

        <div className="space-y-3">
          {requirements.map((req) => (
            <div key={req.id} className="space-y-1.5 border-t border-border pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-start gap-2">
                {req.met ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <AlertTriangle
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${req.severity === "blocking" ? "text-destructive" : "text-warning"}`}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium">{req.label}</p>
                  {!req.met && <p className="text-[10px] text-muted-foreground">{req.description}</p>}
                </div>
              </div>

              {!req.met && canManage && req.id === "pipeline" && (
                <div className="flex gap-1.5 pl-5">
                  <Input
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    placeholder="Nome do pipeline"
                    className="h-7 text-[11px]"
                  />
                  <Button size="sm" className="h-7 shrink-0 text-[11px]" onClick={fixPipeline} disabled={saving === "pipeline" || !pipelineName.trim()}>
                    Criar
                  </Button>
                </div>
              )}

              {!req.met && canManage && req.id === "loss_reason" && (
                <div className="flex gap-1.5 pl-5">
                  <Input
                    value={lossReasonLabel}
                    onChange={(e) => setLossReasonLabel(e.target.value)}
                    placeholder="Ex: Preço alto"
                    className="h-7 text-[11px]"
                  />
                  <Button size="sm" className="h-7 shrink-0 text-[11px]" onClick={fixLossReason} disabled={saving === "loss_reason" || !lossReasonLabel.trim()}>
                    Criar
                  </Button>
                </div>
              )}

              {!req.met && req.id === "company" && (
                <div className="pl-5">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); navigate("/companies?action=new"); }}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Cadastrar empresa <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {!req.met && !canManage && (req.id === "pipeline" || req.id === "loss_reason") && (
                <p className="pl-5 text-[10px] text-muted-foreground">Peça a um admin/manager para configurar.</p>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
