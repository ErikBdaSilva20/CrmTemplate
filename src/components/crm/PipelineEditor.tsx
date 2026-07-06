import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createStage, updateStage, deleteStage, type PipelineStage } from "@/lib/data";
import { DEFAULT_STAGE_COLORS } from "@/lib/constants";

// Stage editor consumed by DealsScreen ("Personalizar pipeline"). Edits a
// local draft and saves everything at once, letting an admin reorder/rename
// several stages before committing any writes.
interface StageDraft {
  id?: string;
  name: string;
  color: string;
  win_probability: number;
}

interface PipelineEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
  onSaved: () => void;
}

export function PipelineEditor({ open, onOpenChange, pipelineId, stages, onSaved }: PipelineEditorProps) {
  const [draft, setDraft] = useState<StageDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed the draft only on the open transition (false→true), not on every
  // `stages` reference change. Callers pass `stages.filter(...)`, a new
  // array on every render, so depending on it directly reset in-progress
  // edits whenever the parent screen re-rendered for an unrelated reason.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const current = [...stages]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color || DEFAULT_STAGE_COLORS[0],
          win_probability: Number(s.win_probability) || 0,
        }));
      setDraft(current.length > 0 ? current : [{ name: "", color: DEFAULT_STAGE_COLORS[0], win_probability: 50 }]);
    }
    wasOpen.current = open;
  }, [open, stages]);

  const addStage = () =>
    setDraft([...draft, { name: "", color: DEFAULT_STAGE_COLORS[draft.length % DEFAULT_STAGE_COLORS.length], win_probability: 50 }]);

  const removeStage = (idx: number) => setDraft(draft.filter((_, i) => i !== idx));

  const moveStage = (idx: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= draft.length) return;
    const next = [...draft];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setDraft(next);
  };

  const updateField = (idx: number, field: keyof StageDraft, value: string | number) =>
    setDraft(draft.map((s, i) => {
      if (i !== idx) return s;
      if (field === "win_probability") {
        return { ...s, win_probability: Math.min(100, Math.max(0, Number(value) || 0)) };
      }
      return { ...s, [field]: value };
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const remainingIds = new Set(draft.filter((s) => s.id).map((s) => s.id!));
      const toDelete = stages.filter((s) => !remainingIds.has(s.id));
      await Promise.all([
        ...toDelete.map((s) => deleteStage(s.id)),
        ...draft.map((s, i) => {
          const payload = { name: s.name, color: s.color, win_probability: s.win_probability, sort_order: i, pipeline_id: pipelineId };
          return s.id ? updateStage(s.id, payload) : createStage(payload);
        }),
      ]);

      toast.success("Pipeline atualizado!");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar pipeline");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Personalizar Pipeline</DialogTitle>
          <DialogDescription>Edite os estágios do seu pipeline de vendas</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {draft.map((stage, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={stage.color}
                onChange={(e) => updateField(idx, "color", e.target.value)}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border-0"
                aria-label={`Cor do estágio ${idx + 1}`}
              />
              <Input
                value={stage.name}
                onChange={(e) => updateField(idx, "name", e.target.value)}
                placeholder={`Estágio ${idx + 1}`}
                className="min-w-0 flex-1"
              />
              <div className="flex shrink-0 items-center gap-1">
                <Input
                  type="number" min={0} max={100}
                  value={stage.win_probability}
                  onChange={(e) => updateField(idx, "win_probability", Number(e.target.value))}
                  className="w-14 text-center text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => moveStage(idx, "up")} aria-label="Mover estágio para cima">
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === draft.length - 1} onClick={() => moveStage(idx, "down")} aria-label="Mover estágio para baixo">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                {draft.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStage(idx)} aria-label="Remover estágio">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addStage}>
            <Plus className="mr-1 h-3.5 w-3.5" />Adicionar estágio
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || draft.some((s) => !s.name.trim())}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
