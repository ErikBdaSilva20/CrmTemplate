import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Plus, RotateCcw, Trophy, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DealWithRelations, LossReason } from "@/lib/data";

interface LossReasonsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lossReasons: LossReason[];
  canManage: boolean;
  newLossReasonLabel: string;
  onNewLossReasonLabelChange: (label: string) => void;
  onAddLossReason: () => void;
  onRemoveLossReason: (id: string) => void;
  allLostDeals: DealWithRelations[];
  onMarkWon: (dealId: string) => void;
  onReopen: (dealId: string) => void;
}

// Painel de Motivos de Perda: gestão das razões cadastradas + revisão dos
// negócios perdidos (marcar como ganho ou reabrir). Recuperado da antiga
// SettingsScreen (removida no Épico 08); vive aqui em /deals em vez de uma
// tela própria — as duas metades (razões + revisão) formam uma única
// feature de review, por isso continuam num arquivo só.
export function LossReasonsPanel({
  open,
  onOpenChange,
  lossReasons,
  canManage,
  newLossReasonLabel,
  onNewLossReasonLabelChange,
  onAddLossReason,
  onRemoveLossReason,
  allLostDeals,
  onMarkWon,
  onReopen,
}: LossReasonsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Motivos de Perda</SheetTitle>
          <SheetDescription>Gerencie os motivos e revise negócios marcados como perdidos.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Razões de Perda</CardTitle>
              <CardDescription className="text-[10px]">
                Motivos disponíveis ao marcar um negócio como perdido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Preço alto"
                    value={newLossReasonLabel}
                    onChange={(e) => onNewLossReasonLabelChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onAddLossReason()}
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="sm" className="h-8" onClick={onAddLossReason}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {lossReasons.map((lr) => (
                  <Badge key={lr.id} variant="secondary" className="text-[10px] gap-1">
                    {lr.label}
                    {canManage && (
                      <button onClick={() => onRemoveLossReason(lr.id)} className="hover:text-destructive" aria-label={`Remover ${lr.label}`}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                ))}
                {lossReasons.length === 0 && (
                  <p className="py-2 text-xs text-muted-foreground">Nenhum motivo cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Negócios Perdidos ({allLostDeals.length})</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {allLostDeals.map((deal) => (
                <Card key={deal.id} className="border-destructive/20 transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{deal.title}</p>
                      {deal.company && <p className="truncate text-xs text-muted-foreground">{deal.company.name}</p>}
                    </div>
                    <p className="text-sm font-semibold text-destructive">{formatCurrency(deal.value, deal.currency || "BRL")}</p>
                    {deal.loss_reason && <p className="truncate text-xs text-muted-foreground">Motivo: {deal.loss_reason}</p>}
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="h-7 flex-1 border-success/30 text-[11px] text-success hover:bg-success/10" onClick={() => onMarkWon(deal.id)}>
                        <Trophy className="mr-1 h-3 w-3" />Ganho
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => onReopen(deal.id)}>
                        <RotateCcw className="mr-1 h-3 w-3" />Reabrir
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
