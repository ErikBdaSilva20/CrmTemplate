import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCompact as fmt } from '@/lib/format';
import type { MonthlyRevenuePoint } from '@/lib/analytics';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tooltipStyle } from './chartTheme';

interface GaugeChartProps {
  value: number;
  max: number;
  label: string;
}

function GaugeChart({ value, max, label }: GaugeChartProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const angle = (percentage / 100) * 180;
  const color =
    percentage >= 100
      ? 'hsl(var(--success))'
      : percentage >= 70
        ? 'hsl(var(--primary))'
        : percentage >= 40
          ? 'hsl(var(--warning))'
          : 'hsl(var(--destructive))';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251.2} 251.2`}
        />
        <text x="100" y="85" textAnchor="middle" className="fill-foreground" fontSize="28" fontWeight="700">
          {Math.round(percentage)}%
        </text>
        <text x="100" y="110" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
          {label}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground mt-1">
        {fmt(value)} / {fmt(max)}
      </p>
    </div>
  );
}

interface RevenueSectionProps {
  monthlyRevenue: MonthlyRevenuePoint[];
  wonRevenue: number;
  monthlyGoal: number;
}

// Receita mensal (12 meses) + meta do mês vivem juntas porque são a mesma
// métrica (receita do período) vista de duas formas — tendência histórica e
// progresso da meta atual — diferente dos outros pares lado a lado no
// Dashboard, que só compartilham a linha do grid por layout, não por domínio.
export function RevenueSection({ monthlyRevenue, wonRevenue, monthlyGoal }: RevenueSectionProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receita Mensal (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
              <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="tendencia"
                stroke="hsl(var(--warning))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Meta do Mês</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <GaugeChart value={wonRevenue} max={monthlyGoal} label={fmt(monthlyGoal)} />
        </CardContent>
      </Card>
    </div>
  );
}
