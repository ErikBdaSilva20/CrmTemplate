import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DealWithRelations, PipelineStage } from "@/lib/data";
import { formatCurrency, formatMonthYear } from "@/lib/format";

type Stage = PipelineStage;

interface DealsForecastProps {
  deals: DealWithRelations[];
  stages: Stage[];
}

interface MonthBucket {
  month: string;
  label: string;
  committed: number;
  bestCase: number;
  pipeline: number;
  deals: DealWithRelations[];
}

export function DealsForecast({ deals, stages }: DealsForecastProps) {
  const buckets = useMemo(() => {
    const map: Record<string, MonthBucket> = {};
    deals.forEach((d) => {
      const date = d.close_date ? new Date(d.close_date) : new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = formatMonthYear(date);
      if (!map[key]) {
        map[key] = { month: key, label, committed: 0, bestCase: 0, pipeline: 0, deals: [] };
      }
      const value = Number(d.value) || 0;
      const prob = Number(d.probability) || 0;
      map[key].pipeline += value;
      if (prob >= 80) map[key].committed += value;
      if (prob >= 50) map[key].bestCase += value;
      map[key].deals.push(d);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [deals]);

  const totals = buckets.reduce(
    (acc, b) => ({
      committed: acc.committed + b.committed,
      bestCase: acc.bestCase + b.bestCase,
      pipeline: acc.pipeline + b.pipeline,
    }),
    { committed: 0, bestCase: 0, pipeline: 0 },
  );

  if (deals.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-20">
        <p className="text-muted-foreground">Nenhum negócio aberto para previsão</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comprometido (≥80%)</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold text-success sm:text-2xl">{formatCurrency(totals.committed)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Caso (≥50%)</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold text-primary sm:text-2xl">{formatCurrency(totals.bestCase)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Total</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold text-foreground sm:text-2xl">{formatCurrency(totals.pipeline)}</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {buckets.map((bucket) => (
          <Card key={bucket.month}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base capitalize">{bucket.label}</CardTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-muted-foreground">Comp.:</span>
                    <span className="font-semibold text-success">{formatCurrency(bucket.committed)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Melhor:</span>
                    <span className="font-semibold text-primary">{formatCurrency(bucket.bestCase)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">{formatCurrency(bucket.pipeline)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                {bucket.pipeline > 0 && (
                  <>
                    <div className="h-full bg-success float-left rounded-l-full" style={{ width: `${(bucket.committed / bucket.pipeline) * 100}%` }} />
                    <div className="h-full bg-primary float-left" style={{ width: `${((bucket.bestCase - bucket.committed) / bucket.pipeline) * 100}%` }} />
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {bucket.deals.map((deal) => {
                  const stageName = stages.find((s) => s.id === deal.stage_id)?.name || "—";
                  return (
                    <div key={deal.id} className="flex flex-col gap-1 rounded-md border border-border p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{deal.title}</span>
                        {deal.company && <span className="shrink-0 text-muted-foreground">· {deal.company.name}</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{stageName}</Badge>
                        <Badge variant="secondary" className="text-xs">{deal.probability || 0}%</Badge>
                        <span className="font-semibold text-primary">
                          {formatCurrency(Number(deal.value) || 0, deal.currency || "BRL")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
