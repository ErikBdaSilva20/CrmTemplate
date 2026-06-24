import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Edit2, X, Save, Building2, Globe, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { INDUSTRIES, COMPANY_SIZES } from "@/lib/constants";
import {
  updateCompany, listContactsByCompany, listDeals, listStages,
  type Company, type Contact, type Deal, type PipelineStage,
} from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";

interface CompanyDrawerProps {
  company: Company | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function CompanyDrawer({ company, onClose, onUpdate }: CompanyDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Company>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);

  // Sem join: busca relacionados em paralelo e filtra no front (§B5).
  const fetchRelated = useCallback(async () => {
    if (!company) return;
    const [contactsByCo, allDeals, allStages] = await Promise.all([
      listContactsByCompany(company.id),
      listDeals(),
      listStages(),
    ]);
    setContacts(contactsByCo);
    setDeals(allDeals.filter((d) => d.company_id === company.id));
    setStages(allStages);
  }, [company]);

  useEffect(() => {
    if (company) { setForm(company); setEditing(false); fetchRelated(); }
  }, [company, fetchRelated]);

  const handleSave = async () => {
    if (!company) return;
    try {
      await updateCompany(company.id, {
        name: form.name, domain: form.domain, industry: form.industry,
        size: form.size, revenue: form.revenue ? Number(form.revenue) : null,
        website: form.website, linkedin_url: form.linkedin_url,
      });
      setEditing(false); onUpdate();
      toast.success("Empresa atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  if (!company) return null;

  const totalDeals = deals.length;
  const totalValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const wonDeals = deals.filter((d) => d.status === "won");
  const wonValue = wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);

  return (
    <Sheet open={!!company} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start gap-4">
            {company.domain ? (
              <img src={`https://logo.clearbit.com/${company.domain}`} alt="" className="h-14 w-14 rounded-lg bg-muted object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Avatar className="h-14 w-14"><AvatarFallback className="bg-primary/10 text-primary text-lg"><Building2 className="h-6 w-6" /></AvatarFallback></Avatar>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold">{company.name}</h2>
              {company.industry && <p className="text-sm text-muted-foreground">{company.industry}</p>}
              {company.domain && <p className="text-xs text-muted-foreground">{company.domain}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg border border-border p-2.5 text-center">
              <p className="text-lg font-bold">{totalDeals}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Negócios</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 text-center">
              <p className="text-lg font-bold text-primary">{formatCurrency(totalValue)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Valor Total</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 text-center">
              <p className="text-lg font-bold text-success">{formatCurrency(wonValue)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Ganhos</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="p-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Visão Geral</TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">Contatos</TabsTrigger>
            <TabsTrigger value="deals" className="flex-1">Negócios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Nome</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Domínio</Label>
                  <Input value={form.domain || ""} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Indústria</Label>
                  <Select value={form.industry || ""} onValueChange={(v) => setForm({ ...form, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar indústria" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tamanho</Label>
                  <Select value={form.size || ""} onValueChange={(v) => setForm({ ...form, size: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Receita anual</Label>
                  <Input type="number" value={form.revenue ?? ""} onChange={(e) => setForm({ ...form, revenue: e.target.value ? Number(e.target.value) : null })} /></div>
                <div className="space-y-1"><Label className="text-xs">Website</Label>
                  <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">LinkedIn</Label>
                  <Input value={form.linkedin_url || ""} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full"><Save className="mr-2 h-4 w-4" />Salvar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {company.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{company.website}</a>
                  </div>
                )}
                {company.size && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{company.size} funcionários</span>
                  </div>
                )}
                {company.revenue && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Receita: {formatCurrency(Number(company.revenue))}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{formatDate(company.created_at)}</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="mt-4 space-y-2">
            {contacts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum contato vinculado</p>
            ) : (
              contacts.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {c.first_name[0]}{c.last_name?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                    {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  </div>
                  {c.title && <span className="text-xs text-muted-foreground">{c.title}</span>}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="deals" className="mt-4 space-y-2">
            {deals.map((d) => {
              const stage = stages.find((s) => s.id === d.stage_id);
              return (
                <Card key={d.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{d.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {stage && <Badge variant="secondary" className="text-[10px]">{stage.name}</Badge>}
                          <Badge variant="secondary" className={`text-[10px] ${d.status === "won" ? "bg-success/10 text-success" : d.status === "lost" ? "bg-destructive/10 text-destructive" : ""}`}>
                            {d.status === "open" ? "Aberto" : d.status === "won" ? "Ganho" : "Perdido"}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatCurrency(Number(d.value) || 0, d.currency || "BRL")}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {deals.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum negócio</p>}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
