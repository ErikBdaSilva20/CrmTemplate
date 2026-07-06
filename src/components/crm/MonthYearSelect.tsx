import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface MonthYearSelectProps {
  value?: string | null;
  onChange: (isoDate: string) => void;
}

// Fechamento recorrente: em vez de uma data exata, o usuário escolhe apenas o
// mês/ano em que o negócio deve fechar/recorrer. Salvo internamente como o
// dia 1 do mês (close_date), sem precisar de coluna nova no banco.
export function MonthYearSelect({ value, onChange }: MonthYearSelectProps) {
  const now = new Date();
  const [yearStr, monthStr] = (value || "").split("-");
  const year = Number(yearStr) || now.getFullYear();
  const month = Number(monthStr) || now.getMonth() + 1;

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 1 + i);

  const setMonth = (m: string) => onChange(`${year}-${m.padStart(2, "0")}-01`);
  const setYear = (y: string) => onChange(`${y}-${String(month).padStart(2, "0")}-01`);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={String(month)} onValueChange={setMonth}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTHS_PT.map((label, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={setYear}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
