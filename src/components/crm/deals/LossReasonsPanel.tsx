import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RotateCcw, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DealWithRelations } from "@/lib/data";

interface LossReasonsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allLostDeals: DealWithRelations[];
  onMarkWon: (dealId: string) => void;
  onReopen: (dealId: string) => void;
}

// Painel de revisão de negócios perdidos — permite marcar como ganho ou reabrir.
export function LossReasonsPanel({
  open,
  onOpenChange,
  allLostDeals,
  onMarkWon,
  onReopen,
}: LossReasonsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Negócios Perdidos</SheetTitle>
          <SheetDescription>
            Revise os negócios perdidos. Você pode marcá-los como ganhos ou reabri-los.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            {allLostDeals.length} negócio{allLostDeals.length !== 1 ? "s" : ""} perdido{allLostDeals.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {allLostDeals.map((deal) => (
              <Card key={deal.id} className="border-destructive/20 transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{deal.title}</p>
                    {deal.company && (
                      <p className="truncate text-xs text-muted-foreground">{deal.company.name}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-destructive">
                    {formatCurrency(deal.value, deal.currency || "BRL")}
                  </p>
                  {deal.loss_reason && (
                    <p className="truncate text-xs text-muted-foreground italic">
                      "{deal.loss_reason}"
                    </p>
                  )}
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 border-success/30 text-[11px] text-success hover:bg-success/10"
                      onClick={() => onMarkWon(deal.id)}
                    >
                      <Trophy className="mr-1 h-3 w-3" />
                      Ganho
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 text-[11px]"
                      onClick={() => onReopen(deal.id)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reabrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {allLostDeals.length === 0 && (
              <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
                Nenhum negócio perdido no momento
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
