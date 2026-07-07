import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES, COMPANY_SIZES } from "@/lib/constants";

// Shared field set for creating/editing a company — used by both
// CompanyCreateModal and the edit mode of CompanyDrawer, which used to
// repeat the same name/domain/industry/size/revenue/website/linkedin fields
// (mesmo padrão de ContactForm.tsx, ver Auditoria Geral 2026-07-07 §4).
export interface CompanyFormValue {
  name: string;
  domain: string;
  industry: string;
  size: string;
  revenue: string; // string no form (input number); coerção pra number|null é do chamador no submit
  website: string;
  linkedin_url: string;
}

export const EMPTY_COMPANY_FORM: CompanyFormValue = {
  name: "", domain: "", industry: "", size: "", revenue: "", website: "", linkedin_url: "",
};

interface CompanyFormProps {
  value: CompanyFormValue;
  onChange: (patch: Partial<CompanyFormValue>) => void;
  errors?: Partial<Record<"name", string>>;
}

export function CompanyForm({ value, onChange, errors }: CompanyFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Nome *</Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={errors?.name ? "border-destructive" : ""}
        />
        {errors?.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Domínio (para logo automático)</Label>
        <Input
          value={value.domain}
          onChange={(e) => onChange({ domain: e.target.value })}
          placeholder="empresa.com.br"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Indústria</Label>
        <Select value={value.industry} onValueChange={(v) => onChange({ industry: v })}>
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
        <Select value={value.size} onValueChange={(v) => onChange({ size: v })}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>
            {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Receita anual</Label>
        <Input type="number" value={value.revenue} onChange={(e) => onChange({ revenue: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Website</Label>
        <Input value={value.website} onChange={(e) => onChange({ website: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">LinkedIn</Label>
        <Input value={value.linkedin_url} onChange={(e) => onChange({ linkedin_url: e.target.value })} />
      </div>
    </div>
  );
}
