import { BantBadge } from '@/components/crm/BantBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Activity, DealWithRelations } from '@/lib/data';
import { ACTIVITY_TYPE, DEAL_STATUS } from '@/lib/domain';
import { formatCurrency, formatDate } from '@/lib/format';
import { Building2, CalendarDays, DollarSign, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MAX_VISIBLE_ACTIVITIES = 3;

interface EntityInfoCardProps {
  deal: DealWithRelations;
  activities: Activity[];
}

// Resumo reutilizável de um deal (BANT, contato, empresa, fechamento,
// atividades) — usado no Dashboard (lista de deals) e referenciado no Kanban
// de Deals. Puramente presentacional: recebe dados por props, sem `db`.
export function EntityInfoCard({ deal, activities }: EntityInfoCardProps) {
  const navigate = useNavigate();

  const dealActivities = activities
    .filter((a) => a.deal_id === deal.id)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, MAX_VISIBLE_ACTIVITIES);

  const contactName = deal.contact
    ? `${deal.contact.first_name} ${deal.contact.last_name || ''}`.trim()
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => navigate(`/deals/${deal.id}`)}
          className="flex w-full items-center justify-between gap-2 text-left hover:opacity-80 transition-opacity"
        >
          <CardTitle className="min-w-0 flex-1 truncate text-sm font-medium">
            {deal.title}
          </CardTitle>
          <Badge
            variant="secondary"
            className={`shrink-0 ${DEAL_STATUS[deal.status].badgeClassName}`}
          >
            {DEAL_STATUS[deal.status].label}
          </Badge>
        </button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {(deal.company?.name || contactName) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {deal.company?.name && (
              <span className="flex min-w-0 items-center gap-1">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{deal.company.name}</span>
              </span>
            )}
            {contactName && (
              <span className="flex min-w-0 items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{contactName}</span>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            {formatCurrency(deal.value, deal.currency || 'BRL')}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {formatDate(deal.close_date)}
          </span>
        </div>

        <div className="pt-1">
          <BantBadge score={deal.qualification_score} />
        </div>

        <div className="space-y-1 border-t border-border pt-2">
          {dealActivities.length > 0 ? (
            dealActivities.map((a) => {
              const Icon = ACTIVITY_TYPE[a.type].icon;
              return (
                <div key={a.id} className="flex items-center gap-1.5 text-[11px]">
                  <Icon className={`h-3 w-3 shrink-0 ${ACTIVITY_TYPE[a.type].textClassName}`} />
                  <span className="min-w-0 flex-1 truncate text-foreground">{a.title}</span>
                  <span className="shrink-0 text-muted-foreground">{formatDate(a.created_at)}</span>
                </div>
              );
            })
          ) : (
            <p className="text-[11px] text-muted-foreground">Sem atividades</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
