import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { LossReason } from "@/lib/data";

interface LossReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lossReasons: LossReason[];
  lossReason: string;
  onLossReasonChange: (reason: string) => void;
  lossNote: string;
  onLossNoteChange: (note: string) => void;
  onConfirm: () => void;
}

// Modal exibido ao marcar um único negócio como perdido no Kanban/Lista —
// motivos vêm de listLossReasons(), não mais lista fixa (AUDITORIA-CODIGO §4.1).
export function LossReasonModal({
  open,
  onOpenChange,
  lossReasons,
  lossReason,
  onLossReasonChange,
  lossNote,
  onLossNoteChange,
  onConfirm,
}: LossReasonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
          <DialogDescription>Por que este negócio foi perdido?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={lossReason} onValueChange={onLossReasonChange}>
              <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
              <SelectContent>
                {lossReasons.filter((lr) => lr.is_active).map((lr) => (
                  <SelectItem key={lr.id} value={lr.label}>{lr.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea value={lossNote} onChange={(e) => onLossNoteChange(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!lossReason}>Confirmar Perda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
