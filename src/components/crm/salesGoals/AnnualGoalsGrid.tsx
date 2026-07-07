import { useMemo } from "react";
import { ArrowDown, ArrowUp, Sigma, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MonthlyGoalPoint } from "@/lib/analytics";
import { resolvePeriod } from "@/lib/period";
import { enumerateMonths } from "@/lib/periodAggregation";
import { goalTypeInfo, formatGoalValue, PACE_STYLES } from "./goalTypes";

export interface GoalTypeAnnualRow {
  goalType: string;
  points: MonthlyGoalPoint[]; // 12 pontos, um por mês (ver computeAnnualGoalSummary, src/lib/analytics.ts)
}

interface AnnualGoalsGridProps {
  rows: GoalTypeAnnualRow[];
  year: number;
}

// Card quadrado de um mês. Grid responsivo (3 a 6 colunas conforme a
// largura) em vez de uma tabela larga com scroll horizontal — evita quebrar
// em telas estreitas (o problema que a versão em tabela tinha).
function MonthCard({ goalType, label, point }: { goalType: string; label: string; point: MonthlyGoalPoint }) {
  const paceStyle = point.pace ? PACE_STYLES[point.pace] : null;
  return (
    <div
      className={`aspect-square rounded-lg border p-2 flex flex-col items-center justify-center gap-0.5 text-center ${
        point.hasGoal ? "border-border bg-muted/30" : "border-dashed border-border/50"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
      {point.hasGoal ? (
        <>
          <span className="text-xs font-bold leading-tight">{formatGoalValue(goalType, point.actual)}</span>
          <span className="text-[9px] text-muted-foreground leading-tight">/ {formatGoalValue(goalType, point.target)}</span>
          <div className="flex items-center gap-1">
            {paceStyle && (
              <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${paceStyle.badge}`}>
                {point.percent}%
              </Badge>
            )}
            {point.percent >= 100 && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
          </div>
          {point.momVariation !== null && (
            <span className={`flex items-center text-[9px] ${point.momVariation >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {point.momVariation >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(point.momVariation)}%
            </span>
          )}
        </>
      ) : (
        <span className="text-lg text-muted-foreground/40">—</span>
      )}
    </div>
  );
}

// Card quadrado de total anual — mesmo formato dos meses, para fechar a
// grade como mais um card em vez de um resumo textual separado.
function TotalCard({ goalType, points }: { goalType: string; points: MonthlyGoalPoint[] }) {
  const totalTarget = points.reduce((sum, p) => sum + p.target, 0);
  const totalActual = points.reduce((sum, p) => sum + p.actual, 0);
  return (
    <div className="aspect-square rounded-lg border border-primary/30 bg-primary/5 p-2 flex flex-col items-center justify-center gap-0.5 text-center">
      <Sigma className="h-3 w-3 text-primary" />
      <span className="text-[10px] font-semibold uppercase text-primary">Total</span>
      <span className="text-xs font-bold leading-tight">{formatGoalValue(goalType, totalActual)}</span>
      <span className="text-[9px] text-muted-foreground leading-tight">/ {formatGoalValue(goalType, totalTarget)}</span>
    </div>
  );
}

// Visão Anual (FR-11): lista vertical, um card por tipo de meta com metas
// cadastradas no ano selecionado; dentro de cada um, uma grade responsiva de
// cards quadrados — 12 meses + total anual — que quebra em mais colunas em
// telas largas e menos em telas estreitas, sem precisar de scroll horizontal.
// Meses sem meta cadastrada aparecem como "—", distinto de uma meta com
// valor 0 (ver hasGoal em MonthlyGoalPoint).
export function AnnualGoalsGrid({ rows, year }: AnnualGoalsGridProps) {
  const monthLabels = useMemo(() => enumerateMonths(resolvePeriod({ kind: "year", year })), [year]);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma meta cadastrada em {year}. Troque para a visão mensal para criar a primeira.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map(({ goalType, points }) => {
        const info = goalTypeInfo(goalType);
        const Icon = info.icon;
        return (
          <Card key={goalType}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className={`h-4 w-4 shrink-0 ${info.color}`} />
                {info.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {points.map((point, i) => (
                  <MonthCard key={point.month} goalType={goalType} label={monthLabels[i].label} point={point} />
                ))}
                <TotalCard goalType={goalType} points={points} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
