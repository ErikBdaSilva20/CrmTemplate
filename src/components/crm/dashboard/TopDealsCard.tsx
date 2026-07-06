import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityInfoCard } from '@/components/crm/EntityInfoCard';
import { formatCurrencyCompact as fmt } from '@/lib/format';
import type { Activity, DealWithRelations } from '@/lib/data';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';

interface TopDealsCardProps {
  topDeals: DealWithRelations[];
  totalOpenCount: number;
  activities: Activity[];
}

// Lista expansível dos negócios abertos mais relevantes (lib/analytics.ts:
// selectTopDeals — maior BANT, depois maior valor, depois close_date mais
// próxima). Clicar expande um EntityInfoCard inline em vez de navegar.
export function TopDealsCard({ topDeals, totalOpenCount, activities }: TopDealsCardProps) {
  const navigate = useNavigate();
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Principais Negócios</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => navigate('/deals')}>
            Ver pipeline <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {topDeals.length > 0 ? (
          <div className="space-y-2">
            {topDeals.map((deal) => {
              const isExpanded = expandedDealId === deal.id;
              const panelId = `dashboard-deal-${deal.id}`;
              return (
                <div key={deal.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedDealId(isExpanded ? null : deal.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-left hover:bg-accent/30 transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                  >
                    <span className="flex min-w-0 items-center gap-1 text-xs font-medium">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{deal.title}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{fmt(deal.value)}</span>
                  </button>
                  {isExpanded && (
                    <div id={panelId} role="region" className="mt-1.5">
                      <EntityInfoCard deal={deal} activities={activities} />
                    </div>
                  )}
                </div>
              );
            })}
            {totalOpenCount > topDeals.length && (
              <button
                type="button"
                onClick={() => navigate('/deals')}
                className="w-full rounded-md py-1 text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                +{totalOpenCount - topDeals.length} mais · Ver pipeline
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
            Nenhum negócio ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
