// Executa uma ação assíncrona em lote sobre uma lista de ids e trata
// sucesso/falha parcial de forma consistente — extrai o padrão que
// Contacts/Companies/Deals reimplementavam (Promise.all + toast.success
// fixo, sem tratamento de erro nenhum: uma falha no meio da lista rejeitava
// a Promise.all inteira, sem toast e sem re-sincronizar o estado da seleção).
import { toast } from "sonner";

export interface BatchResult<T> {
  succeededIds: T[];
  failed: { id: T; error: unknown }[];
}

/**
 * Roda `action` para cada id via `Promise.allSettled` (não `Promise.all`):
 * uma falha não aborta as demais nem mascara os sucessos. Pura — sem toast,
 * testável isoladamente com ações mock.
 */
export async function runBatch<T>(
  ids: T[],
  action: (id: T) => Promise<unknown>,
): Promise<BatchResult<T>> {
  const results = await Promise.allSettled(ids.map((id) => action(id)));
  const succeededIds: T[] = [];
  const failed: { id: T; error: unknown }[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") succeededIds.push(ids[i]);
    else failed.push({ id: ids[i], error: result.reason });
  });
  return { succeededIds, failed };
}

/** Padroniza o toast de sucesso/falha a partir de um BatchResult — mensagens customizáveis por tela. */
export function reportBatchResult<T>(
  result: BatchResult<T>,
  labels: { success: (count: number) => string; failure: (count: number) => string },
): void {
  if (result.succeededIds.length > 0) toast.success(labels.success(result.succeededIds.length));
  if (result.failed.length > 0) toast.error(labels.failure(result.failed.length));
}
