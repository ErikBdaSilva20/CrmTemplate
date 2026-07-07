import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Deal } from '@/lib/data';
import { formatDate, formatMonthYear } from '@/lib/format';
import { Calendar, Percent } from 'lucide-react';

export function DealDetailsCard({ deal }: { deal: Deal }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Detalhes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Fechamento
          </span>
          <span className="capitalize">{formatMonthYear(deal.close_date)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            Probabilidade
          </span>
          <span>{deal.probability || 0}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Criado em</span>
          <span>{formatDate(deal.created_at)}</span>
        </div>
        {deal.status === 'lost' && deal.loss_reason && (
          <div className="mt-2 rounded-md bg-destructive/10 p-2">
            <p className="text-xs font-medium text-destructive">Motivo da perda:</p>
            <p className="text-xs text-destructive/80">{deal.loss_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
