import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, X, Search, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { INDUSTRIES, COMPANY_SIZES } from "@/lib/constants";
import { createCompany, listContacts, updateContact, type Contact } from "@/lib/data";

interface CompanyCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CompanyCreateModal({ open, onOpenChange, onCreated }: CompanyCreateModalProps) {
  const [form, setForm] = useState({
    name: "", domain: "", industry: "", size: "", revenue: "",
    website: "", linkedin_url: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Contacts multi-select
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactsOpen, setContactsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    listContacts().then((data) =>
      setContacts([...data].sort((a, b) => a.first_name.localeCompare(b.first_name))),
    );
  }, [open]);

  useEffect(() => {
    if (form.domain && form.domain.includes(".")) {
      setLogoUrl(`https://logo.clearbit.com/${form.domain}`);
    } else {
      setLogoUrl(null);
    }
  }, [form.domain]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) => {
      const name = `${c.first_name} ${c.last_name || ""}`.toLowerCase();
      return name.includes(q) || (c.email || "").toLowerCase().includes(q);
    });
  }, [contacts, contactSearch]);

  const selectedContacts = useMemo(() =>
    contacts.filter((c) => selectedContactIds.includes(c.id)),
    [contacts, selectedContactIds]
  );

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nome é obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // owner_id NUNCA é enviado — o gateway o seta pela sessão.
  const handleCreate = async () => {
    if (!validate()) return;
    try {
      const created = await createCompany({
        name: form.name, domain: form.domain || null,
        industry: form.industry || null, size: form.size || null,
        revenue: form.revenue ? Number(form.revenue) : null,
        website: form.website || null, linkedin_url: form.linkedin_url || null,
      });

      // Vincula contatos selecionados à nova empresa
      if (selectedContactIds.length > 0 && created?.id) {
        await Promise.all(
          selectedContactIds.map((cid) => updateContact(cid, { company_id: created.id })),
        );
      }

      onOpenChange(false);
      setForm({ name: "", domain: "", industry: "", size: "", revenue: "", website: "", linkedin_url: "" });
      setSelectedContactIds([]);
      setContactSearch("");
      onCreated();
      toast.success("Empresa criada", {
        description: selectedContactIds.length > 0 ? `${selectedContactIds.length} contato(s) vinculado(s)` : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar empresa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Nova Empresa</DialogTitle>
          <DialogDescription>Preencha os dados da nova empresa</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-4 mt-2">
            {/* Logo preview */}
            <div className="flex justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-16 w-16 rounded-lg bg-muted object-contain" onError={() => setLogoUrl(null)} />
              ) : (
                <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/10 text-primary"><Building2 className="h-8 w-8" /></AvatarFallback></Avatar>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={errors.name ? "border-destructive" : ""} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Domínio (para logo automático)</Label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="empresa.com.br" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Indústria</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
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
              <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Receita anual</Label>
              <Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">LinkedIn</Label>
              <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
            </div>

            {/* Contacts multi-select */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" /> Contatos vinculados
              </Label>
              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedContacts.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                      {c.first_name} {c.last_name || ""}
                      <button onClick={() => toggleContact(c.id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Popover open={contactsOpen} onOpenChange={setContactsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground font-normal">
                    <Search className="h-3.5 w-3.5 mr-2" />
                    {selectedContactIds.length > 0 ? `${selectedContactIds.length} selecionado(s)` : "Buscar contatos..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="max-h-48">
                    {filteredContacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">Nenhum contato encontrado</p>
                    ) : (
                      filteredContacts.map((c) => {
                        const selected = selectedContactIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleContact(c.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                          >
                            <div className={`h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                              {selected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{c.first_name} {c.last_name || ""}</p>
                              {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                            </div>
                            {c.company_id && (
                              <Badge variant="outline" className="text-[10px] shrink-0">já vinculado</Badge>
                            )}
                          </button>
                        );
                      })
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleCreate} className="w-full">Criar Empresa</Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
