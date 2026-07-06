import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParticlesCanvas } from '@/components/ParticlesCanvas';
import type { Pipeline } from '@/lib/data';
import type { PeriodFilter } from '@/lib/analytics';
import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  lastRefresh: Date;
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  pipelines: Pipeline[];
  pipelineFilter: string;
  onPipelineFilterChange: (pipelineId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function DashboardHeader({
  lastRefresh,
  period,
  onPeriodChange,
  pipelines,
  pipelineFilter,
  onPipelineFilterChange,
  onRefresh,
  refreshing,
}: DashboardHeaderProps) {
  return (
    <div className="dashboard-hero relative overflow-hidden rounded-xl border px-4 py-5 shadow-sm">
      <ParticlesCanvas />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Atualizado{' '}
            {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="this_week">Esta semana</SelectItem>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="this_quarter">Trimestre</SelectItem>
              <SelectItem value="this_year">Este ano</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
          {pipelines.length > 1 && (
            <Select value={pipelineFilter} onValueChange={onPipelineFilterChange}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos pipelines</SelectItem>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" className="h-8" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
