import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ContactForm, EMPTY_CONTACT_FORM, type ContactFormValue } from "@/components/crm/ContactForm";
import { createContact, type Company } from "@/lib/data";

interface ContactCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  companies: Company[];
}

export function ContactCreateModal({ open, onOpenChange, onCreated, companies }: ContactCreateModalProps) {
  const [form, setForm] = useState<ContactFormValue>(EMPTY_CONTACT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = "Nome é obrigatório";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // owner_id NUNCA é enviado — o gateway o seta pela sessão.
  const handleCreate = async () => {
    if (!validate()) return;
    try {
      await createContact({
        first_name: form.first_name, last_name: form.last_name || null,
        email: form.email || null, phone: form.phone || null, title: form.title || null,
        status: form.status, linkedin_url: form.linkedin_url || null,
        company_id: form.company_id || null,
      });
      onOpenChange(false);
      setForm(EMPTY_CONTACT_FORM);
      onCreated();
      toast.success("Contato criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar contato");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
          <DialogDescription>Preencha os dados do novo contato</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <ContactForm
            value={form}
            onChange={(patch) => setForm({ ...form, ...patch })}
            companies={companies}
            errors={errors}
          />
          <Button onClick={handleCreate} className="w-full">Criar Contato</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
