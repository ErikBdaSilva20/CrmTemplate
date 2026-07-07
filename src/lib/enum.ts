// Utilitário genérico para validar/normalizar texto livre (ex: célula de
// CSV importado, query param, input de formulário) contra um enum
// conhecido do domínio (ContactStatus, DealStatus, ActivityType, etc).
//
// O motivo de existir: vários `Record<Enum, ...>` do app (CONTACT_STATUS,
// DEAL_STATUS, ACTIVITY_TYPE em src/lib/domain.ts) são indexados
// diretamente por um valor vindo de fora (ex: import de CSV) sem checagem —
// um valor fora do enum quebra a leitura (`undefined.label`) no primeiro
// componente que tentar renderizá-lo. Este coercer nunca lança; devolve
// `null` para o chamador decidir o fallback (ex: omitir o campo e deixar o
// default do schema assumir).

export function coerceEnumValue<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return allowed.find((value) => value.toLowerCase() === normalized) ?? null;
}
