// Postgres `numeric` columns can round-trip through the gateway's JSON
// serialization as strings even though generated types (types.gen.ts)
// declare them as `number` — normalize once per repo instead of every call
// site (and every repo) reimplementing `Number(x) || 0` (Masia Clone-Template
// Audit Framework §7).

export function coerceNumeric(value: unknown): number {
  return Number(value) || 0;
}

// Returns a shallow copy of `obj` with every field in `keys` coerced through
// coerceNumeric. Use directly for non-nullable numeric columns (default 0 on
// bad/missing input); for a nullable column that must preserve `null`,
// branch on `value == null` at the call site instead (see companies.repo.ts).
export function normalizeNumericFields<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly (keyof T)[],
): T {
  const patch = {} as Pick<T, (typeof keys)[number]>;
  for (const key of keys) {
    patch[key] = coerceNumeric(obj[key]) as T[typeof key];
  }
  return { ...obj, ...patch };
}
