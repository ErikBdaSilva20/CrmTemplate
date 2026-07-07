import { ArrowUpDown } from "lucide-react";

// Cabeçalho de coluna ordenável, compartilhado entre ContactsTable,
// CompaniesScreen e DealsList — as 3 tabelas do CRM tinham essa mesma
// button+ícone reimplementada (Auditoria Geral 2026-07-07 §4).
interface SortHeaderProps<K extends string> {
  label: string;
  field: K;
  onSort: (field: K) => void;
}

export function SortHeader<K extends string>({ label, field, onSort }: SortHeaderProps<K>) {
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}
