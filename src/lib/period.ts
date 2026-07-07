// Sistema Unificado de Período — fundação técnica de
// `_bmad-output/planning-artifacts/prds/prd-CrmTemplate-2026-07-07/prd.md` §4.1.
//
// Substitui as implementações paralelas de filtro de data (Dashboard,
// Deals, Contacts, Activities/Tasks, Sales Goals) por um único vocabulário:
// todo Período resolve para um `Interval` com início E fim explícitos
// (início-inclusivo, fim-exclusivo). Funções puras, sem estado, testáveis
// isoladamente — nenhuma depende de React nem de dados carregados.
//
// 100% client-side: apenas calcula datas, nunca acessa `db`/`client.ts`
// (Importantdoc.md §B5/§B7). Não editar este contrato para adicionar
// filtro por query — isso é extensão de fundação, fora de escopo permanente
// (PRD §5, addendum.md).

import { getWeekRange } from "@/lib/date";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Intervalo concreto que delimita um Período resolvido.
 *
 * `start`/`end` só são `null` para o preset "Tudo" (intervalo aberto, sem
 * fronteiras). Em qualquer outro caso ambos são datas concretas — é essa
 * garantia (nunca só "início", como o antigo `getPeriodStart`) que permite
 * "Este ano" significar um ano fechado mesmo quando ainda não acabou.
 *
 * Semântica de fronteira, fixa em todo o produto: início inclusivo,
 * fim exclusivo (`>= start && < end`).
 */
export interface Interval {
  start: Date | null;
  end: Date | null;
  label: string;
}

/** Presets relativos ao "agora" — mesmos 6 valores de `PeriodFilter` (analytics.ts), preservados por compatibilidade de vocabulário. */
export type PeriodPreset = "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "all";

/**
 * Período — a seleção temporal ativa numa tela (Glossário do PRD §3).
 * Um Preset relativo, ou um dos três formatos de Período Absoluto: ano
 * específico, mês específico dentro de um ano, ou intervalo customizado.
 */
export type Period =
  | { kind: "preset"; preset: PeriodPreset }
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number } // month: 1-12
  | { kind: "custom"; from: Date; to: Date };

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  this_week: "Esta semana",
  this_month: "Este mês",
  this_quarter: "Trimestre",
  this_year: "Este ano",
  all: "Tudo",
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Dia seguinte à meia-noite de `date` — usado como fim exclusivo quando a
// UI trabalha em granularidade de dia (ex: "até 15/03" deve incluir o dia
// 15 inteiro, então o fim exclusivo é 16/03 00:00).
function dayAfter(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function resolvePreset(preset: PeriodPreset, now: Date): Interval {
  const label = PRESET_LABELS[preset];
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: dayAfter(now), label };
    case "this_week": {
      // Reaproveita o cálculo de semana (segunda–domingo) já testado em
      // date.ts em vez de duplicar a lógica de "qual é a segunda-feira
      // desta semana". getWeekRange retorna fim inclusivo (23:59:59.999);
      // convertemos para fim-exclusivo somando 1ms.
      const { start, end } = getWeekRange(0, now);
      return { start, end: new Date(end.getTime() + 1), label };
    }
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1), label };
    case "this_quarter": {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), quarterStart, 1), end: new Date(now.getFullYear(), quarterStart + 3, 1), label };
    }
    case "this_year":
      // Sempre o ano-calendário inteiro, nunca "1º/jan até agora" — é a
      // correção central que a Auditoria pediu (§Bloco 1).
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1), label };
    case "all":
      return { start: null, end: null, label };
  }
}

/**
 * Resolve qualquer Período para o Intervalo concreto que ele representa.
 * Única função de resolução de datas do produto — todas as telas devem
 * passar por aqui (FR-19: nenhuma tela reintroduz lógica de data própria).
 */
export function resolvePeriod(period: Period, now = new Date()): Interval {
  switch (period.kind) {
    case "preset":
      return resolvePreset(period.preset, now);
    case "year":
      return { start: new Date(period.year, 0, 1), end: new Date(period.year + 1, 0, 1), label: String(period.year) };
    case "month":
      return {
        start: new Date(period.year, period.month - 1, 1),
        end: new Date(period.year, period.month, 1),
        label: `${MONTHS_PT[period.month - 1]}/${period.year}`,
      };
    case "custom":
      return { start: startOfDay(period.from), end: dayAfter(period.to), label: "Personalizado" };
  }
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Campos como `close_date` (ver MonthYearSelect.tsx) são salvos como
// "YYYY-MM-DD" puro, sem hora. `new Date("YYYY-MM-DD")` interpreta isso
// como meia-noite UTC — em fusos negativos (ex: Brasil, UTC-3) isso cai no
// dia anterior em hora local, reintroduzindo o bug de "dia trocado perto
// da meia-noite" que a Auditoria encontrou (§5.1) e que `toLocalDateKey`
// (date.ts) já evita para agrupamento. Datas com hora/timezone explícitos
// (ex: `created_at`, sempre `Date.toISOString()`) representam um instante
// concreto e não sofrem desse problema — só o formato "date-only" precisa
// do parse manual em componentes locais.
function toComparableDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

/**
 * Testa se uma data está dentro de um Intervalo (início-inclusivo,
 * fim-exclusivo). Intervalo totalmente aberto ("Tudo") sempre retorna
 * `true`. Valor ausente (sem data cadastrada) retorna `false` quando o
 * intervalo é limitado — sem data, não há como estar "dentro" de um
 * recorte temporal.
 */
export function isInInterval(value: string | Date | null | undefined, interval: Interval): boolean {
  if (interval.start === null && interval.end === null) return true;
  if (value == null) return false;
  const date = toComparableDate(value);
  if (interval.start !== null && date < interval.start) return false;
  if (interval.end !== null && date >= interval.end) return false;
  return true;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, date.getDate());
}

/**
 * Intervalo imediatamente anterior a um Período, de mesma duração —
 * usado para a Variação Período-a-Período (FR-6). Generalizado para
 * qualquer `Period` (não só Presets) porque telas futuras (Dashboard,
 * Sales Goals) comparam também anos/meses absolutos, não só relativos.
 *
 * Retorna `null` quando "anterior" não faz sentido (preset "Tudo" não tem
 * período anterior — é o intervalo inteiro).
 */
export function previousInterval(period: Period, now = new Date()): Interval | null {
  switch (period.kind) {
    case "preset": {
      switch (period.preset) {
        case "today":
          return resolvePreset("today", new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
        case "this_week": {
          const { start, end } = getWeekRange(-1, now);
          return { start, end: new Date(end.getTime() + 1), label: "Semana anterior" };
        }
        case "this_month": {
          const prevMonthDate = addMonths(now, -1);
          return resolvePreset("this_month", prevMonthDate);
        }
        case "this_quarter": {
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          const prevQuarterAnchor = new Date(now.getFullYear(), quarterStart - 3, 1);
          return resolvePreset("this_quarter", prevQuarterAnchor);
        }
        case "this_year":
          return resolvePreset("this_year", new Date(now.getFullYear() - 1, 0, 1));
        case "all":
          return null;
      }
      break;
    }
    case "year":
      return resolvePeriod({ kind: "year", year: period.year - 1 }, now);
    case "month": {
      const anchor = new Date(period.year, period.month - 2, 1); // month - 1 (0-idx) - 1 (prev)
      return resolvePeriod({ kind: "month", year: anchor.getFullYear(), month: anchor.getMonth() + 1 }, now);
    }
    case "custom": {
      const current = resolvePeriod(period, now);
      const durationMs = (current.end as Date).getTime() - (current.start as Date).getTime();
      const prevEnd = current.start as Date;
      const prevStart = new Date(prevEnd.getTime() - durationMs);
      return { start: prevStart, end: prevEnd, label: "Intervalo anterior" };
    }
  }
}

/** Janela default de anos oferecida pelo Seletor de Período (FR-3): corrente−N…corrente. Ajustável sem tocar em telas. */
export const DEFAULT_YEAR_WINDOW = 5;

/**
 * Anos selecionáveis no Seletor de Período — janela fixa `corrente−N…corrente`
 * (decisão confirmada no PRD §8 Q1: não deriva do registro mais antigo do
 * banco), em ordem crescente.
 */
export function getSelectableYears(now = new Date(), windowSize = DEFAULT_YEAR_WINDOW): number[] {
  const current = now.getFullYear();
  return Array.from({ length: windowSize + 1 }, (_, i) => current - windowSize + i);
}
