// Seleção em lote via Set<string> — o mesmo padrão toggleAll/toggleOne
// reimplementado em ContactsScreen/CompaniesScreen/DealsList (Auditoria
// Geral 2026-07-07 §4). Funções puras em vez de um hook porque a seleção
// ora vive em state local (Contacts/Companies), ora é controlada pelo pai
// (DealsList recebe `selectedDeals`/`onSelectionChange` de DealsScreen) —
// isso funciona igual nos dois casos.

export function isAllSelected(selected: Set<string>, ids: string[]): boolean {
  return ids.length > 0 && ids.every((id) => selected.has(id));
}

export function toggleSetAll(selected: Set<string>, ids: string[]): Set<string> {
  return isAllSelected(selected, ids) ? new Set() : new Set(ids);
}

export function toggleSetOne(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
