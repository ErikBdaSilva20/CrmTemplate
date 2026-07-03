import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ACTIVITY_TYPE, ACTIVITY_TYPES } from "@/lib/domain";
import {
  createActivity, updateActivity,
  type Activity, type Contact, type Company, type Deal, type ActivityType,
} from "@/lib/data";

// Extracted from ActivitiesScreen (AUDITORIA-CODIGO.md §2), which mixed this
// ~190-line modal with the screen's own state and calendar view.
const TYPE_HINTS: Record<ActivityType, string> = {
  note: "Registre observações sobre contatos, negócios ou empresas",
  task: "Crie uma tarefa com prazo",
  meeting: "Agende uma reunião com data e horário",
  call: "Registre uma ligação com contato e resultado",
  email: "Crie um rascunho de email para acompanhamento",
};

interface ActivityCreateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  onSaved: () => void;
}

export function ActivityCreateEditModal({
  open, onOpenChange, activity, contacts, companies, deals, onSaved,
}: ActivityCreateEditModalProps) {
  const isEdit = !!activity;

  const [type, setType] = useState<ActivityType>("task");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dealId, setDealId] = useState<string>("none");
  const [contactId, setContactId] = useState<string>("none");

  const selectedDeal = deals.find((d) => d.id === dealId);
  const resolvedContactId = dealId !== "none" && selectedDeal?.contact_id
    ? selectedDeal.contact_id
    : contactId !== "none" ? contactId : null;
  const selectedContact = contacts.find((c) => c.id === resolvedContactId);
  const resolvedCompanyId = selectedDeal?.company_id || selectedContact?.company_id || null;
  const resolvedCompany = companies.find((c) => c.id === resolvedCompanyId);

  useEffect(() => {
    if (activity) {
      setType(activity.type);
      setTitle(activity.title);
      setBody(activity.body || "");
      setDueDate(activity.due_date ? activity.due_date.slice(0, 16) : "");
      setDealId(activity.deal_id || "none");
      setContactId(activity.contact_id || "none");
    } else {
      setType("task");
      setTitle("");
      setBody("");
      setDueDate("");
      setDealId("none");
      setContactId("none");
    }
  }, [activity, open]);

  const handleDealChange = (val: string) => {
    setDealId(val);
    if (val !== "none") {
      const deal = deals.find((d) => d.id === val);
      if (deal?.contact_id) setContactId(deal.contact_id);
    }
  };

  // owner_id setado pelo gateway — não enviar.
  const handleSave = async () => {
    if (!title.trim()) return;
    const payload = {
      type,
      title: title.trim(),
      body: body || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      deal_id: dealId !== "none" ? dealId : null,
      contact_id: resolvedContactId,
      company_id: resolvedCompanyId,
    };

    try {
      if (isEdit) {
        await updateActivity(activity!.id, payload);
        toast.success("Atividade atualizada");
      } else {
        await createActivity(payload);
        toast.success("Atividade criada");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const availableContacts = dealId !== "none" && selectedDeal?.company_id
    ? contacts.filter((c) => c.company_id === selectedDeal.company_id || !c.company_id)
    : contacts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          <DialogDescription>{TYPE_HINTS[type]}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {ACTIVITY_TYPES.map((t) => {
              const Icon = ACTIVITY_TYPE[t].icon;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${type === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {ACTIVITY_TYPE[t].label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              {type === "note" ? "Assunto" : type === "call" ? "Resumo da ligação" : "Título"} *
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={
              type === "note" ? "Assunto da nota..." : type === "call" ? "Resumo da ligação..." : type === "meeting" ? "Nome da reunião..." : type === "email" ? "Assunto do email..." : "Título da tarefa..."
            } />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              {type === "note" ? "Conteúdo" : type === "call" ? "Notas da ligação" : type === "meeting" ? "Pauta / Notas" : type === "email" ? "Corpo do email" : "Descrição"}
            </Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={type === "note" || type === "email" ? 6 : 3} />
          </div>

          {(type === "task" || type === "meeting" || type === "call") && (
            <div className="space-y-1">
              <Label className="text-xs">
                {type === "meeting" ? "Data/hora" : type === "call" ? "Data/hora da ligação" : "Prazo"}
              </Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Negócio</Label>
            <Select value={dealId} onValueChange={handleDealChange}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Contato</Label>
            <Select
              value={resolvedContactId || "none"}
              onValueChange={(v) => setContactId(v)}
              disabled={dealId !== "none" && !!selectedDeal?.contact_id}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {availableContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dealId !== "none" && selectedDeal?.contact_id && (
              <p className="text-[10px] text-muted-foreground">Preenchido automaticamente pelo negócio</p>
            )}
          </div>

          {resolvedCompany && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Empresa (vinculada automaticamente)</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                🏢 {resolvedCompany.name}
              </div>
            </div>
          )}

          <Button onClick={handleSave} className="w-full" disabled={!title.trim()}>
            {isEdit ? "Salvar Alterações" : "Criar Atividade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
