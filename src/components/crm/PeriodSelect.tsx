import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getSelectableYears, type Period, type PeriodPreset } from "@/lib/period";

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "this_week", label: "Esta semana" },
  { value: "this_month", label: "Este mês" },
  { value: "this_quarter", label: "Trimestre" },
  { value: "this_year", label: "Este ano" },
  { value: "all", label: "Tudo" },
];

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Mode = Period["kind"];

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "preset", label: "Relativo" },
  { value: "year", label: "Ano específico" },
  { value: "month", label: "Mês específico" },
  { value: "custom", label: "Intervalo" },
];

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface PeriodSelectProps {
  value: Period;
  onChange: (period: Period) => void;
  yearWindow?: number;
}

/**
 * Seletor de Período reutilizável (Glossário do PRD §3) — absorve os 4
 * formatos que `period.ts` resolve: Preset relativo, Ano específico, Mês
 * específico e Intervalo customizado. Primeiro consumidor: Companies
 * (FR-13); telas seguintes (Dashboard, Sales Goals, Activities/Tasks)
 * devem reaproveitar este componente em vez de escrever o próprio Select.
 */
export function PeriodSelect({ value, onChange, yearWindow }: PeriodSelectProps) {
  const now = new Date();
  const years = getSelectableYears(now, yearWindow);
  const mode = value.kind;

  const setMode = (next: Mode) => {
    if (next === mode) return;
    switch (next) {
      case "preset":
        onChange({ kind: "preset", preset: "all" });
        break;
      case "year":
        onChange({ kind: "year", year: now.getFullYear() });
        break;
      case "month":
        onChange({ kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 });
        break;
      case "custom":
        onChange({ kind: "custom", from: now, to: now });
        break;
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MODE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {value.kind === "preset" && (
        <Select value={value.preset} onValueChange={(v) => onChange({ kind: "preset", preset: v as PeriodPreset })}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESET_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {value.kind === "year" && (
        <Select value={String(value.year)} onValueChange={(v) => onChange({ kind: "year", year: Number(v) })}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {value.kind === "month" && (
        <>
          <Select
            value={String(value.month)}
            onValueChange={(v) => onChange({ kind: "month", year: value.year, month: Number(v) })}
          >
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS_PT.map((label, i) => <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={String(value.year)}
            onValueChange={(v) => onChange({ kind: "month", year: Number(v), month: value.month })}
          >
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      )}

      {value.kind === "custom" && (
        <>
          <Input
            type="date"
            className="w-36 h-8 text-xs"
            value={toIsoDate(value.from)}
            onChange={(e) => e.target.value && onChange({ kind: "custom", from: fromIsoDate(e.target.value), to: value.to })}
          />
          <Input
            type="date"
            className="w-36 h-8 text-xs"
            value={toIsoDate(value.to)}
            onChange={(e) => e.target.value && onChange({ kind: "custom", from: value.from, to: fromIsoDate(e.target.value) })}
          />
        </>
      )}
    </div>
  );
}
