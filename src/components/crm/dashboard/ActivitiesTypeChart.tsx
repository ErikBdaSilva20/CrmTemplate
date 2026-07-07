import type { NamedCount } from '@/lib/analytics';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS, tooltipStyle } from './chartTheme';
import { ChartCard } from './ChartCard';

interface ActivitiesTypeChartProps {
  data: NamedCount[];
}

export function ActivitiesTypeChart({ data }: ActivitiesTypeChartProps) {
  return (
    <ChartCard
      title="Atividades por Tipo"
      hasData={data.length > 0}
      emptyMessage="Nenhuma atividade"
      height={220}
    >
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
