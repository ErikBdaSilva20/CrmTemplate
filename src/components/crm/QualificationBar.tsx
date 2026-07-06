// Presentacionais de qualificação BANT — extraídos de DealQualification.tsx
// (módulo stateful com useState/updateDeal/toast) para que Dashboard e Kanban
// possam reutilizá-los sem arrastar esse estado nem arriscar import circular.

export function getScoreColor(score: number) {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  if (score >= 25) return 'text-primary';
  return 'text-muted-foreground';
}

export function getProgressColor(score: number) {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  if (score >= 25) return 'bg-primary';
  return 'bg-muted-foreground';
}

export function LeadScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-success/10 text-success border-success/30'
      : score >= 60
        ? 'bg-warning/10 text-warning border-warning/30'
        : score >= 30
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-muted text-muted-foreground';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${color}`}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-current" />
      {score}
    </div>
  );
}

// Mini-barra de qualificação para cards/listas de deals.
export function QualificationBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-label="Qualificação BANT"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${getProgressColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-[9px] font-bold ${getScoreColor(score)}`}>{score}%</span>
    </div>
  );
}
