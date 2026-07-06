import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthYearSelect } from "@/components/crm/MonthYearSelect";
import type { Company, Contact, Deal, PipelineStage } from "@/lib/data";

interface DealFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Deal | null;
  form: Partial<Deal>;
  onFormChange: (patch: Partial<Deal>) => void;
  pipelineStages: PipelineStage[];
  contacts: Contact[];
  companies: Company[];
  onSave: () => void;
}

// Sheet de criar/editar negócio — sem campo "Responsável" (owner_id é
// setado pelo gateway a partir da sessão, nunca enviado pelo front).
export function DealFormSheet({
  open,
  onOpenChange,
  editing,
  form,
  onFormChange,
  pipelineStages,
  contacts,
  companies,
  onSave,
}: DealFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar Negócio" : "Novo Negócio"}</SheetTitle>
          <SheetDescription>{editing ? "Atualize os dados do negócio" : "Preencha os dados do novo negócio"}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title || ""} onChange={(e) => onFormChange({ title: e.target.value })} placeholder="Nome do negócio" />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Valor</strong>: quanto esse negócio representa em receita.</p>
            <p><strong className="text-foreground">Probabilidade</strong>: chance estimada (%) de fechar, usada para priorizar o funil.</p>
            <p><strong className="text-foreground">Fechamento</strong>: mês/ano em que esse negócio deve fechar (fechamento recorrente).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" value={form.value ?? ""} onChange={(e) => onFormChange({ value: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={form.currency || "BRL"} onValueChange={(v) => onFormChange({ currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estágio</Label>
            <Select value={form.stage_id || ""} onValueChange={(v) => onFormChange({ stage_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelineStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contato</Label>
            <Select value={form.contact_id || "none"} onValueChange={(v) => onFormChange({ contact_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={form.company_id || "none"} onValueChange={(v) => onFormChange({ company_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Probabilidade (%)</Label>
              <Input type="number" min={0} max={100} value={form.probability ?? ""} onChange={(e) => onFormChange({ probability: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <MonthYearSelect value={form.close_date} onChange={(v) => onFormChange({ close_date: v })} />
            </div>
          </div>
          <Button onClick={onSave} className="w-full">{editing ? "Salvar" : "Criar Negócio"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
