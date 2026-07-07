// Camada Compartilhada de Recorte e Agregação — PRD §4.2.
//
// Consolida numa única implementação o que hoje está reimplementado em
// cada tela: filtrar uma coleção pelo Período ativo (list-then-filter) e
// agregar por mês. Todas as telas que precisarem de recorte/agregação por
// data devem consumir estas funções em vez de escrever a própria — é o que
// elimina a divergência entre "o mesmo número calculado de formas
// diferentes em telas diferentes" (NFR de Consistência de Cálculo).
//
// Funções puras: dado o mesmo input, sempre o mesmo output. Nenhuma faz
// cache própria (sem WeakMap/memoize) — o projeto não tem esse padrão em
// nenhum outro lugar; a memoização "por render" já exigida pelo PRD
// (não recalcular a mesma agregação por card) é responsabilidade de quem
// chama, via `useMemo`, exatamente como já é feito em CompaniesScreen.tsx,
// DashboardScreen.tsx etc. Evita reinventar cache antes de precisar de um.
//
// 100% client-side sobre dados já carregados via `db.table(x).list()`
// (Importantdoc.md §B5) — nunca adiciona parâmetro de data a uma chamada
// de rede.

import { type Interval, isInInterval, resolvePeriod } from "@/lib/period";

/**
 * Recorte por Período — o único list-then-filter por data do produto
 * (FR-17). `getDate` parametriza o campo de data por recurso (ex:
 * `created_at` para contatos/empresas, `close_date`/`updated_at` para
 * deals conforme a métrica).
 */
export function filterByInterval<T>(
  items: T[],
  interval: Interval,
  getDate: (item: T) => string | Date | null | undefined,
): T[] {
  return items.filter((item) => isInInterval(getDate(item), interval));
}

/** Um mês concreto (ano + mês), o ponto de dado que a agregação mensal produz por unidade de tempo. */
export interface MonthPoint {
  year: number;
  month: number; // 1-12
  label: string;
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Enumera os meses cobertos por um Intervalo, em ordem cronológica.
 * Intervalo aberto ("Tudo", sem `start`/`end`) não tem meses enumeráveis —
 * retorna `[]`; quem chama decide o fallback (ex: cair para "últimos 12
 * meses" como o Dashboard faz para Presets curtos, FR-7).
 */
export function enumerateMonths(interval: Interval): MonthPoint[] {
  if (interval.start === null || interval.end === null) return [];
  const months: MonthPoint[] = [];
  let cursor = new Date(interval.start.getFullYear(), interval.start.getMonth(), 1);
  while (cursor < interval.end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1, label: MONTHS_PT[cursor.getMonth()] });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

/** Um ponto agregado: o mês e o valor da métrica calculada sobre os itens daquele mês. */
export interface AggregatedMonthPoint {
  month: MonthPoint;
  value: number;
}

/**
 * Agregação por mês compartilhada (FR-18): para cada mês do Intervalo,
 * recorta os itens daquele mês e aplica `metric` sobre eles. Substitui o
 * laço fixo de "últimos 12 meses a partir de agora" — a mesma função serve
 * receita, contagem de deals, atividades ou contatos por mês; a métrica
 * (soma/contagem/o que for) é decidida por quem chama, não por esta função.
 */
export function aggregateByMonth<T>(
  items: T[],
  interval: Interval,
  getDate: (item: T) => string | Date | null | undefined,
  metric: (itemsInMonth: T[]) => number,
): AggregatedMonthPoint[] {
  return enumerateMonths(interval).map((month) => {
    const monthInterval = resolvePeriod({ kind: "month", year: month.year, month: month.month });
    const itemsInMonth = filterByInterval(items, monthInterval, getDate);
    return { month, value: metric(itemsInMonth) };
  });
}
