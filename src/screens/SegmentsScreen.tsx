import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Filter, Pencil, Trash2, Users, Handshake } from "lucide-react";
import { toast } from "sonner";
import {
  listSegments, createSegment, updateSegment, deleteSegment,
  type Segment,
} from "@/lib/data";

// Filtros salvos por usuário (owner setado pelo gateway). Reusa a tabela `segments`:
// cada segmento guarda um filtro reaproveitável para Contatos ou Negócios em `filters` (jsonb).
// A aplicação direta nas listas é melhoria de Onda 2 (ver docs/10 §8).

interface SegmentFilters {
  entity?: "contacts" | "deals";
  status?: string;     // contatos
  min_value?: number;  // negócios
  max_value?: number;  // negócios
}

export default function SegmentsScreen() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSeg, setEditSeg] = useState<Segment | null>(null);

  const [form, setForm] = useState({
    name: "", description: "", entity: "contacts" as "contacts" | "deals",
    status: "any", minValue: "", maxValue: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSegments(await listSegments());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditSeg(null);
    setForm({ name: "", description: "", entity: "contacts", status: "any", minValue: "", maxValue: "" });
    setDialogOpen(true);
  };

  const openEdit = (s: Segment) => {
    const f = (s.filters || {}) as SegmentFilters;
    setEditSeg(s);
    setForm({
      name: s.name,
      description: s.description || "",
      entity: f.entity || "contacts",
      status: f.status || "any",
      minValue: f.min_value != null ? String(f.min_value) : "",
      maxValue: f.max_value != null ? String(f.max_value) : "",
    });
    setDialogOpen(true);
  };

  // owner_id setado pelo gateway — não enviar.
  const save = async () => {
    if (!form.name.trim()) return;
    const filters: SegmentFilters = { entity: form.entity };
    if (form.entity === "contacts" && form.status !== "any") filters.status = form.status;
    if (form.entity === "deals") {
      if (form.minValue) filters.min_value = Number(form.minValue);
      if (form.maxValue) filters.max_value = Number(form.maxValue);
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      filters: filters as unknown as Segment["filters"],
    };
    try {
      if (editSeg) {
        await updateSegment(editSeg.id, payload);
        toast.success("Filtro atualizado");
      } else {
        await createSegment(payload);
        toast.success("Filtro salvo");
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const remove = async (id: string) => {
    await deleteSegment(id);
    toast.success("Filtro excluído");
    fetchData();
  };

  const describe = (s: Segment) => {
    const f = (s.filters || {}) as SegmentFilters;
    const parts: string[] = [];
    if (f.status) parts.push(`status = ${f.status}`);
    if (f.min_value != null) parts.push(`valor ≥ ${f.min_value}`);
    if (f.max_value != null) parts.push(`valor ≤ ${f.max_value}`);
    return parts.length ? parts.join(" · ") : "sem critérios";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Filtros Salvos</h1>
          <p className="text-muted-foreground text-sm">Segmentos reaproveitáveis de Contatos e Negócios</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" />Novo Filtro
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum filtro salvo</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
            <Plus className="mr-1 h-3 w-3" />Criar primeiro filtro
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((s) => {
            const entity = ((s.filters || {}) as SegmentFilters).entity || "contacts";
            const EntityIcon = entity === "deals" ? Handshake : Users;
            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <EntityIcon className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{s.name}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(s)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(s.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {entity === "deals" ? "Negócios" : "Contatos"}
                  </Badge>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  <p className="text-[10px] text-muted-foreground">{describe(s)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editSeg ? "Editar Filtro" : "Novo Filtro"}</DialogTitle>
            <DialogDescription>Salve um conjunto de critérios para reutilizar nas listas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entidade</Label>
              <Select value={form.entity} onValueChange={(v) => setForm({ ...form, entity: v as "contacts" | "deals" })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contatos</SelectItem>
                  <SelectItem value="deals">Negócios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.entity === "contacts" && (
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.entity === "deals" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Valor mínimo</Label>
                  <Input type="number" value={form.minValue} onChange={(e) => setForm({ ...form, minValue: e.target.value })} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor máximo</Label>
                  <Input type="number" value={form.maxValue} onChange={(e) => setForm({ ...form, maxValue: e.target.value })} className="h-9 text-xs" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={!form.name.trim()}>{editSeg ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
