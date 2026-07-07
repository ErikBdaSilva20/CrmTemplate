import { useEffect, useState, useCallback, useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Edit2, X, Mail, Phone, Building2, Briefcase, Save,
} from "lucide-react";
import { toast } from "sonner";
import { ContactForm, type ContactFormValue } from "@/components/crm/ContactForm";
import { useDeals } from "@/hooks/useDeals";
import { useStages } from "@/hooks/usePipelines";
import { invalidateActivities } from "@/hooks/useActivities";
import { ACTIVITY_TYPE, ACTIVITY_TYPES, CONTACT_STATUS, DEAL_STATUS } from "@/lib/domain";
import {
  updateContact, listActivitiesByContact, createActivity,
  type Contact, type Company, type Activity, type ActivityType,
} from "@/lib/data";
import { formatCurrency, formatDate, formatDateTime, formatDateShort } from "@/lib/format";

interface ContactDrawerProps {
  contact: Contact | null;
  onClose: () => void;
  onUpdate: () => void;
  companies: Company[];
}

function toFormValue(contact: Contact): ContactFormValue {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    title: contact.title || "",
    linkedin_url: contact.linkedin_url || "",
    status: contact.status || "lead",
    company_id: contact.company_id || "",
  };
}

export function ContactDrawer({ contact, onClose, onUpdate, companies }: ContactDrawerProps) {
  const { data: deals } = useDeals();
  const { data: stages } = useStages();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ContactFormValue>(() => contact ? toFormValue(contact) : {
    first_name: "", last_name: "", email: "", phone: "", title: "",
    linkedin_url: "", status: "lead", company_id: "",
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityForm, setActivityForm] = useState({ type: "note" as ActivityType, title: "", body: "" });

  const contactDeals = useMemo(
    () => (contact ? deals.filter((d) => d.contact_id === contact.id) : []),
    [deals, contact],
  );

  // Sem join: busca atividades e filtra deals/estágios no front (§B5).
  const fetchActivities = useCallback(async () => {
    if (!contact) return;
    const acts = await listActivitiesByContact(contact.id);
    setActivities([...acts].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")));
  }, [contact]);

  useEffect(() => {
    if (contact) {
      setForm(toFormValue(contact));
      setEditing(false);
      fetchActivities();
    }
  }, [contact, fetchActivities]);

  const handleSave = async () => {
    if (!contact) return;
    try {
      await updateContact(contact.id, {
        first_name: form.first_name, last_name: form.last_name || null,
        email: form.email || null, phone: form.phone || null, title: form.title || null,
        status: form.status, linkedin_url: form.linkedin_url || null,
        company_id: form.company_id || null,
      });
      setEditing(false);
      onUpdate();
      toast.success("Contato atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  // owner_id setado pelo gateway — não enviar.
  const addActivity = async () => {
    if (!contact || !activityForm.title) return;
    try {
      await createActivity({
        contact_id: contact.id, type: activityForm.type,
        title: activityForm.title, body: activityForm.body || null,
      });
      setActivityForm({ type: "note", title: "", body: "" });
      fetchActivities();
      invalidateActivities();
      toast.success("Atividade adicionada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar atividade");
    }
  };

  if (!contact) return null;

  return (
    <Sheet open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {contact.first_name[0]}{contact.last_name?.[0] || ""}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{contact.first_name} {contact.last_name}</h2>
              {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="secondary" className={CONTACT_STATUS[contact.status || "lead"].badgeClassName}>
                  {CONTACT_STATUS[contact.status || "lead"].label}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="p-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Visão Geral</TabsTrigger>
            <TabsTrigger value="activities" className="flex-1">Atividades</TabsTrigger>
            <TabsTrigger value="deals" className="flex-1">Negócios</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notas</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {editing ? (
              <div className="space-y-3">
                <ContactForm value={form} onChange={(patch) => setForm({ ...form, ...patch })} companies={companies} />
                <Button onClick={handleSave} className="w-full"><Save className="mr-2 h-4 w-4" />Salvar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.title && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.title}</span>
                  </div>
                )}
                {contact.linkedin_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">LinkedIn</span>
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{contact.linkedin_url}</a>
                  </div>
                )}
                {(() => {
                  const comp = companies.find((c) => c.id === contact.company_id);
                  return comp ? (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{comp.name}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{formatDate(contact.created_at)}</span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Activities */}
          <TabsContent value="activities" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={activityForm.type} onValueChange={(v) => setActivityForm({ ...activityForm, type: v as ActivityType })}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ACTIVITY_TYPE[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="h-8 text-sm" placeholder="Título" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} />
              </div>
              <Textarea placeholder="Descrição..." value={activityForm.body} onChange={(e) => setActivityForm({ ...activityForm, body: e.target.value })} rows={2} className="text-sm" />
              <Button size="sm" onClick={addActivity} disabled={!activityForm.title}>Adicionar</Button>
            </div>
            <div className="space-y-2">
              {activities.map((a) => {
                const Icon = ACTIVITY_TYPE[a.type].icon;
                return (
                  <div key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{ACTIVITY_TYPE[a.type].label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(a.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.body && <p className="mt-0.5 text-xs text-muted-foreground">{a.body}</p>}
                    </div>
                  </div>
                );
              })}
              {activities.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhuma atividade</p>}
            </div>
          </TabsContent>

          {/* Deals */}
          <TabsContent value="deals" className="mt-4 space-y-2">
            {contactDeals.map((d) => {
              const stage = stages.find((s) => s.id === d.stage_id);
              return (
                <Card key={d.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{d.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {stage && (
                            <Badge variant="secondary" className="text-[10px]">
                              {stage.name}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`text-[10px] ${DEAL_STATUS[d.status || "open"].badgeClassName}`}>
                            {DEAL_STATUS[d.status || "open"].label}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(d.value, d.currency || "BRL")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {contactDeals.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum negócio vinculado</p>}
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="mt-4 space-y-2">
            {activities.filter((a) => a.type === "note").map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDateShort(a.created_at)}
                  </span>
                </div>
                <p className="text-sm font-medium">{a.title}</p>
                {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
              </div>
            ))}
            {activities.filter((a) => a.type === "note").length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma nota</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
