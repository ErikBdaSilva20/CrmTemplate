import type { WeekdayCount } from '@/lib/analytics';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tooltipStyle } from './chartTheme';
import { ChartCard } from './ChartCard';

interface ActivitiesByDayChartProps {
  data: WeekdayCount[];
}

export function ActivitiesByDayChart({ data }: ActivitiesByDayChartProps) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <ChartCard
      title="Atividades por Dia da Semana"
      hasData={hasData}
      emptyMessage="Nenhuma atividade registrada"
      height={180}
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
