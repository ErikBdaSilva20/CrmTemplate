// Parser e exportador de CSV compartilhados entre Contacts e Companies
// (fix-epic 03). O parser anterior (`text.split("\n")`/`line.split(",")`)
// quebrava em campos com vírgula entre aspas, aspas escapadas e CRLF.

// Parseia texto CSV em linhas de células, respeitando aspas RFC4180: vírgula
// e quebra de linha dentro de aspas não separam campo/linha, e `""` dentro de
// aspas vira uma aspa literal. Linhas totalmente vazias são descartadas.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface CsvColumn<T> {
  label: string;
  accessor: (row: T) => string | number | null | undefined;
}

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Gera e dispara o download de um CSV a partir de linhas + definição de
// colunas (label + accessor), com escape correto de aspas/vírgulas/quebras.
export function exportToCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const lines = [
    columns.map((c) => escapeCsvField(c.label)).join(","),
    ...rows.map((row) =>
      columns.map((c) => escapeCsvField(String(c.accessor(row) ?? ""))).join(","),
    ),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
