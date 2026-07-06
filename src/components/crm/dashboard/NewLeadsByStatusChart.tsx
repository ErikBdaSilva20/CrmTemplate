import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NamedCount } from '@/lib/analytics';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, tooltipStyle } from './chartTheme';
import { ArrowRight } from 'lucide-react';

interface NewLeadsByStatusChartProps {
  data: NamedCount[];
}

export function NewLeadsByStatusChart({ data }: NewLeadsByStatusChartProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Novos Contatos por Status</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => navigate('/contacts')}>
            Ver todos <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">Nenhum dado</div>
        )}
      </CardContent>
    </Card>
  );
}
