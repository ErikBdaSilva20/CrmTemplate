import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Trophy, XCircle, Trash2, AlertTriangle } from "lucide-react";
import type { DealWithRelations, PipelineStage } from "@/lib/data";
import { DEAL_STATUS } from "@/lib/domain";
import { formatCurrency, formatMonthYear, monthsUntil } from "@/lib/format";

type Stage = PipelineStage;

type SortKey = "title" | "value" | "close_date" | "probability" | "status" | "created_at";
type SortDir = "asc" | "desc";

interface DealsListProps {
  deals: DealWithRelations[];
  stages: Stage[];
  selectedDeals: Set<string>;
  onSelectionChange: (s: Set<string>) => void;
  onDealClick: (d: DealWithRelations) => void;
  onBatchAction: (action: "won" | "lost" | "delete") => void;
}

export function DealsList({
  deals, stages, selectedDeals, onSelectionChange, onDealClick, onBatchAction,
}: DealsListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...deals].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title": cmp = (a.title || "").localeCompare(b.title || ""); break;
      case "value": cmp = (Number(a.value) || 0) - (Number(b.value) || 0); break;
      case "probability": cmp = (Number(a.probability) || 0) - (Number(b.probability) || 0); break;
      case "close_date": cmp = (a.close_date || "").localeCompare(b.close_date || ""); break;
      case "status": cmp = (a.status || "").localeCompare(b.status || ""); break;
      case "created_at": cmp = (a.created_at || "").localeCompare(b.created_at || ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const allSelected = sorted.length > 0 && sorted.every((d) => selectedDeals.has(d.id));
  const toggleAll = () => {
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(sorted.map((d) => d.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedDeals);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const getStageName = (stageId: string | null) => {
    if (!stageId) return "—";
    return stages.find((s) => s.id === stageId)?.name || "—";
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-3">
      {selectedDeals.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <span className="text-sm font-medium">{selectedDeals.size} selecionados</span>
          <Button size="sm" variant="outline" onClick={() => onBatchAction("won")}>
            <Trophy className="mr-1 h-3.5 w-3.5 text-success" />Ganhos
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBatchAction("lost")}>
            <XCircle className="mr-1 h-3.5 w-3.5 text-destructive" />Perdidos
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onBatchAction("delete")}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />Excluir
          </Button>
        </div>
      )}

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
              </TableHead>
              <TableHead><SortHeader label="Título" field="title" /></TableHead>
              <TableHead><SortHeader label="Valor" field="value" /></TableHead>
              <TableHead className="hidden md:table-cell">Estágio</TableHead>
              <TableHead className="hidden lg:table-cell"><SortHeader label="Probabilidade" field="probability" /></TableHead>
              <TableHead className="hidden sm:table-cell"><SortHeader label="Fechamento" field="close_date" /></TableHead>
              <TableHead><SortHeader label="Status" field="status" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((deal) => {
              const monthsToClose = deal.close_date ? monthsUntil(deal.close_date) : null;
              const isUrgent = monthsToClose !== null && monthsToClose <= 0;

              return (
                <TableRow key={deal.id} className="cursor-pointer" onClick={() => onDealClick(deal)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedDeals.has(deal.id)} onCheckedChange={() => toggleOne(deal.id)} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{deal.title}</span>
                      {deal.company && <p className="text-xs text-muted-foreground">{deal.company.name}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(Number(deal.value) || 0, deal.currency || "BRL")}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{getStageName(deal.stage_id)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {(deal.probability ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">{deal.probability}%</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {deal.close_date ? (
                      <div className={`flex items-center gap-1 text-sm capitalize ${isUrgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {isUrgent && <AlertTriangle className="h-3 w-3" />}
                        {formatMonthYear(deal.close_date)}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={DEAL_STATUS[deal.status || "open"].badgeClassName}>
                      {DEAL_STATUS[deal.status || "open"].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhum negócio encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
