import { getBantTemperature } from '@/lib/analytics';
import { Flame, Ghost, Snowflake, Sun } from 'lucide-react';

interface BantBadgeProps {
  score: number | null | undefined;
}

export function BantBadge({ score }: BantBadgeProps) {
  const temp = getBantTemperature(score);
  const s = score ?? 0;

  if (temp === 'hot') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 border border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
        title="Negócio Quente"
      >
        <Flame className="h-2.5 w-2.5 fill-orange-500" />
        Quente ({s}%)
      </span>
    );
  }

  if (temp === 'warm') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 border border-yellow-500/30"
        title="Negócio Morno"
      >
        <Sun className="h-2.5 w-2.5 fill-yellow-500" />
        Morno ({s}%)
      </span>
    );
  }

  if (temp === 'cold') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-500/30"
        title="Negócio Frio"
      >
        <Snowflake className="h-2.5 w-2.5 fill-blue-500" />
        Frio ({s}%)
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground border border-border"
      title="BANT Desconhecido"
    >
      <Ghost className="h-2.5 w-2.5" />
      Desconhecido
    </span>
  );
}
