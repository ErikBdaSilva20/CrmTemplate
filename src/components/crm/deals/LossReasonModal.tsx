import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface LossReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: { reason: string };
  onFormChange: (patch: Partial<{ reason: string }>) => void;
  onConfirm: () => void;
}

export function LossReasonModal({
  open,
  onOpenChange,
  form,
  onFormChange,
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
            <Label>Motivo / Observação</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => onFormChange({ reason: e.target.value })}
              placeholder="Descreva detalhadamente o motivo da perda..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!form.reason.trim()}>Confirmar Perda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
