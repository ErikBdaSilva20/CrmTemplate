import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCompact as fmt, monthsUntil } from '@/lib/format';
import type { AtRiskDeals } from '@/lib/analytics';
import { AlertTriangle, CalendarDays } from 'lucide-react';

interface RiskDealsSectionProps {
  atRiskDeals: AtRiskDeals;
}

// Dois alertas de negócios abertos que precisam de atenção (lib/analytics.ts:
// computeAtRiskDeals) — sem atividade há 14+ dias, e com fechamento
// vencido/no mês atual e baixa probabilidade.
export function RiskDealsSection({ atRiskDeals }: RiskDealsSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Negócios sem Atividade ({'>'}14 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atRiskDeals.inactive.length > 0 ? (
            <div className="space-y-2">
              {atRiskDeals.inactive.map((d) => {
                const daysSince = d.updated_at
                  ? Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)
                  : 999;
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => navigate(`/deals/${d.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">{daysSince} dias sem atividade</p>
                    </div>
                    <span className="text-xs font-bold text-destructive shrink-0">{fmt(d.value)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">
              Nenhum negócio em risco 🎉
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-warning" />
            Fechamento Próximo (prob {'<'} 50%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atRiskDeals.closingSoon.length > 0 ? (
            <div className="space-y-2">
              {atRiskDeals.closingSoon.slice(0, 5).map((d) => {
                const monthsLeft = d.close_date ? monthsUntil(d.close_date) : 0;
                const closeLabel = monthsLeft < 0 ? 'Vencido' : 'Este mês';
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border border-warning/20 bg-warning/5 p-2 cursor-pointer hover:bg-warning/10 transition-colors"
                    onClick={() => navigate(`/deals/${d.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {closeLabel} · {d.probability}% prob
                      </p>
                    </div>
                    <span className="text-xs font-bold text-warning shrink-0">{fmt(d.value)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">
              Nenhum negócio com fechamento próximo
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
