import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Target, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { updateDeal, type DealQualification as BANTData } from "@/lib/data";
import { BantBadge } from "@/components/crm/BantBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const bantCriteria = [
  { key: "budget" as const, label: "Budget (Orçamento)", description: "O prospect tem orçamento disponível?", icon: "💰", action: "descobrir o limite de gastos" },
  { key: "authority" as const, label: "Authority (Autoridade)", description: "Estamos falando com o decisor?", icon: "👤", action: "identificar quem assina o cheque" },
  { key: "need" as const, label: "Need (Necessidade)", description: "Existe uma necessidade real e urgente?", icon: "🎯", action: "mapear a dor principal" },
  { key: "timeline" as const, label: "Timeline (Urgência)", description: "Há um prazo definido para decisão?", icon: "⏰", action: "entender para quando precisam da solução" },
];

function calcQualScore(data: BANTData): number {
  let score = 0;
  bantCriteria.forEach(({ key }) => {
    if (data[key] === true) score += 25;
  });
  return score;
}

interface Props {
  dealId: string;
  qualification: BANTData | null;
  qualificationScore: number;
  isLateStage?: boolean;
  onUpdate: () => void;
}

export function DealQualification({ dealId, qualification, isLateStage, onUpdate }: Props) {
  const [bant, setBant] = useState<BANTData>({
    budget: null, authority: null, need: null, timeline: null,
    budget_notes: "", authority_notes: "", need_notes: "", timeline_notes: "",
    ...(qualification || {}),
  });
  const [editing, setEditing] = useState(false);

  const score = calcQualScore(bant);

  const save = async () => {
    try {
      await updateDeal(dealId, { qualification: bant, qualification_score: score });
      setEditing(false);
      onUpdate();
      toast.success("Qualificação atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const toggleCriteria = (key: "budget" | "authority" | "need" | "timeline") => {
    const current = bant[key];
    const next = current === null ? true : current === true ? false : null;
    setBant({ ...bant, [key]: next });
  };

  const missingCriteria = bantCriteria.filter(c => bant[c.key] !== true);
  const nextMission = missingCriteria.length > 0 ? missingCriteria[0] : null;

  return (
    <Card className="border-primary/20 shadow-sm relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-primary">
            <Shield className="h-4 w-4" /> BANT (Mentor de Vendas)
          </CardTitle>
          <div className="flex items-center gap-2">
            <BantBadge score={score} />
            {!editing && (
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditing(true)}>Editar</Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        {/* Alerta de "Negociando às Cegas" se o deal está quente (Late Stage) mas BANT é fria */}
        {isLateStage && score < 75 && !editing && (
          <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold mb-0.5">Negociando às cegas!</AlertTitle>
            <AlertDescription className="text-[10px]">
              O negócio está na reta final, mas a qualificação está baixa. Você corre o risco de dar desconto para quem não tem urgência ou dinheiro.
            </AlertDescription>
          </Alert>
        )}

        {/* Missão Atual / Próxima Pergunta */}
        {!editing && nextMission ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary mb-1">Próxima Missão de Qualificação</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Você ainda não sabe o <strong>{nextMission.label}</strong>. Na próxima ligação, foque em <span className="italic font-medium text-foreground">{nextMission.action}</span>.
                </p>
              </div>
            </div>
          </div>
        ) : !editing && missingCriteria.length === 0 ? (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-xs font-bold text-success">Negócio Totalmente Qualificado!</p>
            </div>
          </div>
        ) : null}

        {/* Formulário de Qualificação */}
        <div className="space-y-2">
          {bantCriteria.map(({ key, label, description, icon }) => {
            const val = bant[key];
            const notesKey = `${key}_notes` as keyof BANTData;
            const isTarget = nextMission?.key === key && !editing;
            
            return (
              <div 
                key={key} 
                className={`rounded-md border p-2.5 transition-all duration-300 ${
                  isTarget ? 'border-primary shadow-sm bg-background' :
                  val === true ? "bg-success/5 border-success/30" : 
                  val === false ? "bg-destructive/5 border-destructive/30" : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <div>
                      <p className={`text-xs font-semibold ${isTarget ? 'text-primary' : ''}`}>{label}</p>
                      <p className="text-[10px] text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  {editing ? (
                    <button onClick={() => toggleCriteria(key)} className="rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-accent border border-transparent hover:border-border">
                      {val === true ? (
                        <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" />Sim</span>
                      ) : val === false ? (
                        <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" />Não</span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground"><HelpCircle className="h-3.5 w-3.5" />N/A</span>
                      )}
                    </button>
                  ) : (
                    <span>
                      {val === true ? <CheckCircle2 className="h-4 w-4 text-success" /> : 
                       val === false ? <XCircle className="h-4 w-4 text-destructive" /> : 
                       <HelpCircle className="h-4 w-4 text-muted-foreground/30" />}
                    </span>
                  )}
                </div>
                {editing && (
                  <div className="mt-2 pl-6">
                    <Input
                      className="h-7 text-[10px] bg-background"
                      placeholder="Notas ou respostas do prospect..."
                      value={(bant[notesKey] as string) || ""}
                      onChange={(e) => setBant({ ...bant, [notesKey]: e.target.value })}
                    />
                  </div>
                )}
                {!editing && bant[notesKey] && (
                  <div className="mt-1.5 pl-6 flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground italic leading-tight">{bant[notesKey] as string}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editing && (
          <div className="flex gap-2 justify-end pt-2 border-t border-border mt-4">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save}>Salvar BANT</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
