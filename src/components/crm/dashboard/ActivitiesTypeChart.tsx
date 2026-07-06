import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NamedCount } from '@/lib/analytics';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS, tooltipStyle } from './chartTheme';

interface ActivitiesTypeChartProps {
  data: NamedCount[];
}

export function ActivitiesTypeChart({ data }: ActivitiesTypeChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Atividades por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
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
        ) : (
          <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
            Nenhuma atividade
          </div>
        )}
      </CardContent>
    </Card>
  );
}
