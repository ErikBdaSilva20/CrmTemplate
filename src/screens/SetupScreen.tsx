import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, KanbanSquare, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { INDUSTRIES, DEFAULT_STAGES } from "@/lib/constants";
import { invalidatePipelines, invalidateStages } from "@/hooks/usePipelines";
import { invalidateCompanies } from "@/hooks/useCompanies";
import { createCompany, createPipeline, createStage } from "@/lib/data";

// Setup reduzido aos steps de DADOS (Importantdoc §6 / docs/10 §2.3): empresa-semente +
// pipeline com estágios. Os steps de AI/Resend/Slack/Email saíram (backend/Composio).
// owner_id é setado pelo gateway — não enviamos.

export default function SetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState({ name: "", domain: "", industry: "" });
  const [pipelineName, setPipelineName] = useState("Pipeline de Vendas");

  const finishCompany = () => {
    if (!company.name.trim()) { toast.error("Informe o nome da empresa"); return; }
    setStep(1);
  };

  const finishSetup = async () => {
    setSaving(true);
    try {
      if (company.name.trim()) {
        await createCompany({
          name: company.name.trim(),
          domain: company.domain || null,
          industry: company.industry || null,
        });
        invalidateCompanies();
      }
      const pipeline = await createPipeline({ name: pipelineName.trim() || "Pipeline de Vendas", is_default: true });
      if (pipeline?.id) {
        for (let i = 0; i < DEFAULT_STAGES.length; i++) {
          const s = DEFAULT_STAGES[i];
          await createStage({ pipeline_id: pipeline.id, name: s.name, color: s.color, win_probability: s.win_probability, sort_order: i });
        }
      }
      invalidatePipelines();
      invalidateStages();
      toast.success("Tudo pronto!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao concluir setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-center gap-2">
          {[0, 1].map((i) => (
            <div key={i} className={`h-2 w-16 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-primary" />Sua primeira empresa</CardTitle>
              <CardDescription>Cadastre uma empresa para começar (você pode editar depois)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="Ex: Acme Ltda" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Domínio</Label>
                <Input value={company.domain} onChange={(e) => setCompany({ ...company, domain: e.target.value })} placeholder="acme.com.br" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Indústria</Label>
                <Select value={company.industry} onValueChange={(v) => setCompany({ ...company, industry: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={finishCompany} className="w-full">Continuar <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><KanbanSquare className="h-5 w-5 text-primary" />Seu pipeline de vendas</CardTitle>
              <CardDescription>Criaremos um pipeline com 5 estágios padrão. Você ajusta depois em Negócios → Personalizar pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Nome do pipeline</Label>
                <Input value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_STAGES.map((s) => (
                  <span key={s.name} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Voltar</Button>
                <Button onClick={finishSetup} disabled={saving} className="flex-1">
                  {saving ? "Concluindo..." : <>Concluir <Check className="ml-1 h-4 w-4" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
