import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Snowflake, TrendingUp, Zap } from "lucide-react";
import { getBantTemperature, computePercentage } from "@/lib/analytics";
import type { Deal } from "@/lib/data";

interface BantEfficiencyCardProps {
  deals: Deal[];
}

interface TemperatureStats {
  total: number;
  won: number;
  winRate: number;
}

function computeBantStats(deals: Deal[]): {
  hot: TemperatureStats;
  cold: TemperatureStats;
} {
  const closed = deals.filter((d) => d.status === "won" || d.status === "lost");

  const hotDeals = closed.filter((d) => getBantTemperature(d.qualification_score) === "hot");
  const coldDeals = closed.filter((d) =>
    ["cold", "ghost"].includes(getBantTemperature(d.qualification_score))
  );

  return {
    hot: {
      total: hotDeals.length,
      won: hotDeals.filter((d) => d.status === "won").length,
      winRate: computePercentage(
        hotDeals.filter((d) => d.status === "won").length,
        hotDeals.length
      ),
    },
    cold: {
      total: coldDeals.length,
      won: coldDeals.filter((d) => d.status === "won").length,
      winRate: computePercentage(
        coldDeals.filter((d) => d.status === "won").length,
        coldDeals.length
      ),
    },
  };
}

export function BantEfficiencyCard({ deals }: BantEfficiencyCardProps) {
  const stats = useMemo(() => computeBantStats(deals), [deals]);

  const hasData = stats.hot.total > 0 || stats.cold.total > 0;
  const advantage = stats.hot.winRate - stats.cold.winRate;

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Zap className="h-4 w-4 text-orange-500" />
          Choque de Realidade (BANT)
        </CardTitle>
        <p className="text-[11px] text-muted-foreground leading-tight mt-1">
          Correlação entre qualificação BANT e taxa de vitória nos negócios fechados.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {!hasData ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Sem negócios fechados suficientes para calcular. Continue qualificando!
          </p>
        ) : (
          <>
            {/* Comparação Hot vs Cold */}
            <div className="grid grid-cols-2 gap-3">
              {/* HOT */}
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-orange-600 font-bold text-xs">
                  <Flame className="h-3.5 w-3.5 fill-orange-500" />
                  Qualificados (🔥)
                </div>
                <p className="text-3xl font-black text-orange-600 leading-none">
                  {stats.hot.winRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.hot.won}/{stats.hot.total} negócios ganhos
                </p>
              </div>

              {/* COLD */}
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                  <Snowflake className="h-3.5 w-3.5 fill-blue-500" />
                  Sem Qualificação (🧊)
                </div>
                <p className="text-3xl font-black text-blue-600 leading-none">
                  {stats.cold.winRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.cold.won}/{stats.cold.total} negócios ganhos
                </p>
              </div>
            </div>

            {/* Mensagem de impacto */}
            {advantage > 0 && stats.hot.total >= 2 ? (
              <div className="flex items-start gap-2 rounded-lg bg-success/10 border border-success/30 p-3">
                <TrendingUp className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <p className="text-[11px] text-success font-medium leading-tight">
                  Vendedores que qualificam bem (🔥) convertem{" "}
                  <span className="text-base font-black">{advantage}%</span>{" "}
                  a mais do que quem não qualifica (🧊). Qualifique mais!
                </p>
              </div>
            ) : advantage <= 0 && hasData ? (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border p-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Ainda sem dados suficientes para mostrar a diferença. Continue
                  qualificando e fechando negócios!
                </p>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
