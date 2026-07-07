interface BucketTabsProps<B extends string> {
  buckets: { key: B; label: string }[];
  counts: Record<string, number>;
  value: B;
  onChange: (bucket: B) => void;
  /** Bucket que ganha destaque visual (vermelho) quando ativo e com contagem > 0 — ex: "overdue". */
  destructiveKey?: B;
}

// Linha de abas de Bucket operacional (src/lib/activityBuckets.ts),
// reutilizada por ActivitiesToolbar.tsx e TasksScreen.tsx — antes cada tela
// tinha sua própria cópia quase idêntica deste markup (Auditoria §2.8/§2.10).
export function BucketTabs<B extends string>({ buckets, counts, value, onChange, destructiveKey }: BucketTabsProps<B>) {
  return (
    <div className="flex items-center gap-0.5 py-2 text-xs flex-wrap">
      {buckets.map(({ key, label }) => {
        const count = counts[key] ?? 0;
        const isActive = value === key;
        const isDestructiveTab = key === destructiveKey;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              isActive
                ? isDestructiveTab && count > 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1 text-[10px] ${isDestructiveTab ? "text-destructive" : ""}`}>({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
