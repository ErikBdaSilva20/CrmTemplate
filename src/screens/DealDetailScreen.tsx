import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DealQualification } from "@/components/crm/DealQualification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Trophy, XCircle, Building2, User, Calendar, Percent,
  Phone, Mail, FileText, CheckSquare, CalendarDays, Edit2, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDeal, updateDeal, listStages, listActivitiesByDeal, createActivity,
  getContact, getCompany,
  type Deal, type PipelineStage, type Contact, type Company, type Activity, type ActivityType,
} from "@/lib/data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, meeting: CalendarDays, note: FileText, task: CheckSquare,
};
const activityLabels: Record<ActivityType, string> = {
  call: "Ligação", email: "Email", meeting: "Reunião", note: "Nota", task: "Tarefa",
};

export default function DealDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingValue, setEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState("BRL");

  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [lossNote, setLossNote] = useState("");

  const [activityForm, setActivityForm] = useState({ type: "note" as ActivityType, title: "", body: "" });

  // Sem get-by-id no modo genérico → list-then-find (§B5). Relacionados cruzados no front.
  const fetchDeal = useCallback(async () => {
    if (!id) return;
    const data = await getDeal(id);
    if (!data) { navigate("/deals"); return; }
    setDeal(data);
    setTitleDraft(data.title);
    setValueDraft(String(data.value || 0));
    setCurrencyDraft(data.currency || "BRL");

    const [stagesAll, acts] = await Promise.all([
      listStages(),
      listActivitiesByDeal(id),
    ]);
    setStages(stagesAll);
    setActivities([...acts].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")));

    setContact(data.contact_id ? await getContact(data.contact_id) : null);
    setCompany(data.company_id ? await getCompany(data.company_id) : null);
  }, [id, navigate]);

  useEffect(() => { fetchDeal(); }, [fetchDeal]);

  if (!deal) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const lastActivity = activities[0];
  const daysSinceActivity = lastActivity && lastActivity.created_at
    ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const healthColor = daysSinceActivity <= 3 ? "bg-success" : daysSinceActivity <= 7 ? "bg-warning" : "bg-destructive";
  const healthLabel = daysSinceActivity <= 3 ? "Saudável" : daysSinceActivity <= 7 ? "Atenção" : "Inativo";

  const currentStage = stages.find((s) => s.id === deal.stage_id);
  const orderedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  const currentStageIndex = orderedStages.findIndex((s) => s.id === deal.stage_id);

  const saveTitle = async () => {
    if (!titleDraft.trim()) return;
    await updateDeal(deal.id, { title: titleDraft });
    setDeal({ ...deal, title: titleDraft });
    setEditingTitle(false);
    toast.success("Título atualizado");
  };

  const saveValue = async () => {
    const val = Number(valueDraft) || 0;
    await updateDeal(deal.id, { value: val, currency: currencyDraft });
    setDeal({ ...deal, value: val, currency: currencyDraft });
    setEditingValue(false);
    toast.success("Valor atualizado");
  };

  const changeStage = async (stageId: string) => {
    await updateDeal(deal.id, { stage_id: stageId });
    setDeal({ ...deal, stage_id: stageId });
    toast.success("Estágio atualizado");
  };

  const markAsWon = async () => {
    await updateDeal(deal.id, { status: "won" });
    setDeal({ ...deal, status: "won" });
    toast.success("Negócio marcado como ganho! 🎉");
  };

  const confirmLoss = async () => {
    const reason = lossNote ? `${lossReason}: ${lossNote}` : lossReason;
    await updateDeal(deal.id, { status: "lost", loss_reason: reason });
    setDeal({ ...deal, status: "lost", loss_reason: reason });
    setLossModalOpen(false);
    toast.success("Negócio marcado como perdido");
  };

  // owner_id setado pelo gateway — não enviar.
  const addActivity = async () => {
    if (!activityForm.title) return;
    await createActivity({
      deal_id: deal.id, type: activityForm.type,
      title: activityForm.title, body: activityForm.body || null,
    });
    setActivityForm({ type: "note", title: "", body: "" });
    fetchDeal();
    toast.success("Atividade adicionada");
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/deals")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Voltar para Negócios
      </button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {/* Título */}
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="text-xl font-bold h-auto py-0.5" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTitle()} />
              <button onClick={saveTitle} className="shrink-0 text-success"><Check className="h-5 w-5" /></button>
              <button onClick={() => { setEditingTitle(false); setTitleDraft(deal.title); }} className="shrink-0 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
          ) : (
            <h1 className="text-xl font-bold tracking-tight group cursor-pointer sm:text-2xl" onClick={() => setEditingTitle(true)}>
              {deal.title}
              <Edit2 className="ml-2 inline h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
            </h1>
          )}

          {/* Valor + estágio + saúde — wrap no mobile */}
          <div className="flex flex-wrap items-center gap-2">
            {editingValue ? (
              <>
                <Select value={currencyDraft} onValueChange={setCurrencyDraft}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={valueDraft} onChange={(e) => setValueDraft(e.target.value)} className="w-28 h-8" autoFocus onKeyDown={(e) => e.key === "Enter" && saveValue()} />
                <button onClick={saveValue} className="text-success"><Check className="h-4 w-4" /></button>
                <button onClick={() => setEditingValue(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <span className="text-lg font-bold text-primary cursor-pointer hover:opacity-80 sm:text-xl" onClick={() => setEditingValue(true)}>
                {formatCurrency(Number(deal.value) || 0, deal.currency || "BRL")}
              </span>
            )}

            <Select value={deal.stage_id || ""} onValueChange={changeStage}>
              <SelectTrigger className="h-8 w-40">
                <div className="flex items-center gap-1.5">
                  {currentStage?.color && <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: currentStage.color }} />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {orderedStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${healthColor}`} />
              <span className="text-xs text-muted-foreground">{healthLabel}</span>
            </div>

            {deal.status !== "open" && (
              <Badge variant="secondary" className={deal.status === "won" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>
                {deal.status === "won" ? "Ganho" : "Perdido"}
              </Badge>
            )}
          </div>
        </div>

        {deal.status === "open" && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={markAsWon} className="flex-1 text-success border-success/30 hover:bg-success/10 sm:flex-none">
              <Trophy className="mr-2 h-4 w-4" />Ganho
            </Button>
            <Button variant="outline" onClick={() => setLossModalOpen(true)} className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 sm:flex-none">
              <XCircle className="mr-2 h-4 w-4" />Perdido
            </Button>
          </div>
        )}
      </div>

      {/* Pipeline progress bar */}
      <div className="flex gap-1">
        {orderedStages.map((s, i) => (
          <div
            key={s.id}
            className={`h-2 flex-1 rounded-full transition-colors cursor-pointer ${
              i <= currentStageIndex
                ? deal.status === "won" ? "bg-success" : deal.status === "lost" ? "bg-destructive" : "bg-primary"
                : "bg-muted"
            }`}
            onClick={() => deal.status === "open" && changeStage(s.id)}
            title={s.name}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content: Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Adicionar Atividade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={activityForm.type} onValueChange={(v) => setActivityForm({ ...activityForm, type: v as ActivityType })}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Nota</SelectItem>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-8 text-sm" placeholder="Título" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} />
              </div>
              <Textarea placeholder="Descrição (opcional)" value={activityForm.body} onChange={(e) => setActivityForm({ ...activityForm, body: e.target.value })} rows={2} className="text-sm" />
              <Button size="sm" onClick={addActivity} disabled={!activityForm.title}>Adicionar</Button>
            </CardContent>
          </Card>

          <div className="space-y-1">
            {activities.map((a) => {
              const Icon = activityIcons[a.type];
              return (
                <div key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-muted-foreground">{activityLabels[a.type]}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <div className="py-10 text-center text-muted-foreground text-sm">Nenhuma atividade registrada</div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <DealQualification
            dealId={deal.id}
            qualification={deal.qualification}
            qualificationScore={deal.qualification_score || 0}
            onUpdate={fetchDeal}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />Contato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {contact.first_name[0]}{contact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{contact.first_name} {contact.last_name}</p>
                    {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Nenhum contato vinculado</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company ? (
                <div>
                  <p className="text-sm font-medium">{company.name}</p>
                  {company.domain && <p className="text-xs text-muted-foreground">{company.domain}</p>}
                </div>
              ) : <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Fechamento</span>
                <span>{formatDate(deal.close_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Percent className="h-3.5 w-3.5" />Probabilidade</span>
                <span>{deal.probability || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{formatDate(deal.created_at)}</span>
              </div>
              {deal.loss_reason && (
                <div className="mt-2 rounded-md bg-destructive/10 p-2">
                  <p className="text-xs font-medium text-destructive">Motivo da perda:</p>
                  <p className="text-xs text-destructive/80">{deal.loss_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loss Reason Modal */}
      <Dialog open={lossModalOpen} onOpenChange={setLossModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Perda</DialogTitle>
            <DialogDescription>Por que este negócio foi perdido?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preço">Preço muito alto</SelectItem>
                  <SelectItem value="Concorrência">Perdeu para concorrência</SelectItem>
                  <SelectItem value="Timing">Timing inadequado</SelectItem>
                  <SelectItem value="Budget">Sem orçamento</SelectItem>
                  <SelectItem value="Fit">Produto não atende</SelectItem>
                  <SelectItem value="Sem resposta">Sem resposta do cliente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea value={lossNote} onChange={(e) => setLossNote(e.target.value)} placeholder="Detalhes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmLoss} disabled={!lossReason}>Confirmar Perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
