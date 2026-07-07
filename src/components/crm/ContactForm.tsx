import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CONTACT_STATUS, CONTACT_STATUSES } from "@/lib/domain";
import type { Company, ContactStatus } from "@/lib/data";

// Shared field set for creating/editing a contact — used by both
// ContactCreateModal and the edit mode of ContactDrawer, which used to
// repeat the same name/email/phone/title/linkedin/status/company fields
// (AUDITORIA-CODIGO.md §3.3).
export interface ContactFormValue {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  title: string;
  linkedin_url: string;
  status: ContactStatus;
  company_id: string; // "" means no company
}

export const EMPTY_CONTACT_FORM: ContactFormValue = {
  first_name: "", last_name: "", email: "", phone: "", title: "",
  linkedin_url: "", status: "lead", company_id: "",
};

interface ContactFormProps {
  value: ContactFormValue;
  onChange: (patch: Partial<ContactFormValue>) => void;
  companies: Company[];
  errors?: Partial<Record<"first_name" | "email", string>>;
}

export function ContactForm({ value, onChange, companies, errors }: ContactFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input
            value={value.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })}
            className={errors?.first_name ? "border-destructive" : ""}
          />
          {errors?.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sobrenome</Label>
          <Input value={value.last_name} onChange={(e) => onChange({ last_name: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={errors?.email ? "border-destructive" : ""}
        />
        {errors?.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Telefone</Label>
        <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Cargo</Label>
        <Input value={value.title} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">LinkedIn</Label>
        <Input
          value={value.linkedin_url}
          onChange={(e) => onChange({ linkedin_url: e.target.value })}
          placeholder="https://linkedin.com/in/..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={value.status} onValueChange={(v) => onChange({ status: v as ContactStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTACT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{CONTACT_STATUS[status].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Empresa</Label>
        <Select value={value.company_id || "none"} onValueChange={(v) => onChange({ company_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
