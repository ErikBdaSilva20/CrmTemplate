import { Card, CardContent } from '@/components/ui/card';
import { formatCurrencyCompact as fmt } from '@/lib/format';
import { BarChart3, Clock, DollarSign, Handshake, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface DashboardKpis {
  wonRevenue: number;
  revenueVariation: number;
  wonDealsCount: number;
  pipelineValue: number;
  winRate: number;
  totalClosed: number;
  avgTicket: number;
  avgCycle: number;
  contactsCount: number;
  newContactsCount: number;
}

interface DashboardKpiCardsProps {
  kpis: DashboardKpis;
}

// KPI row do Dashboard — 6 cards clicáveis que navegam pra tela de origem do
// número (Receita/Ganhos/Win Rate/Ticket → Negócios; Ciclo → Atividades;
// Contatos → Contatos).
export function DashboardKpiCards({ kpis }: DashboardKpiCardsProps) {
  const {
    wonRevenue,
    revenueVariation,
    wonDealsCount,
    pipelineValue,
    winRate,
    totalClosed,
    avgTicket,
    avgCycle,
    contactsCount,
    newContactsCount,
  } = kpis;
  const navigate = useNavigate();

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/deals')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Receita</span>
            <DollarSign className="h-3.5 w-3.5 text-success" />
          </div>
          <p className="text-xl font-bold">{fmt(wonRevenue)}</p>
          {revenueVariation !== 0 && (
            <div
              className={`flex items-center gap-0.5 text-[10px] ${revenueVariation > 0 ? 'text-success' : 'text-destructive'}`}
            >
              {revenueVariation > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {revenueVariation > 0 ? '+' : ''}
              {revenueVariation}% vs anterior
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/deals')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ganhos</span>
            <Handshake className="h-3.5 w-3.5 text-success" />
          </div>
          <p className="text-xl font-bold">{wonDealsCount}</p>
          <p className="text-[10px] text-muted-foreground">{fmt(pipelineValue)} em pipeline</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/deals')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Win Rate</span>
            <Target className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xl font-bold">{winRate}%</p>
          <p className="text-[10px] text-muted-foreground">{totalClosed} fechados</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/deals')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xl font-bold">{fmt(avgTicket)}</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/activities')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ciclo Médio</span>
            <Clock className="h-3.5 w-3.5 text-warning" />
          </div>
          <p className="text-xl font-bold">{avgCycle}</p>
          <p className="text-[10px] text-muted-foreground">dias</p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/contacts')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contatos</span>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xl font-bold">{contactsCount}</p>
          <p className="text-[10px] text-muted-foreground">{newContactsCount} novos</p>
        </CardContent>
      </Card>
    </div>
  );
}
