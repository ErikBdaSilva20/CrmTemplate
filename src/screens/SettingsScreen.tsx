import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X, Lock, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, roleAtLeast } from "@/lib/auth";
import { PipelineEditor } from "@/components/crm/PipelineEditor";
import { usePipelines, useStages } from "@/hooks/usePipelines";
import { useLossReasons } from "@/hooks/useLossReasons";
import {
  createPipeline, deletePipeline,
  listTags, createTag, deleteTag,
  createLossReason, deleteLossReason,
  type Tag,
} from "@/lib/data";

export default function SettingsScreen() {
  const { role } = useAuth();
  const canManage = roleAtLeast(role, "manager"); // lookups: admin/manager escreve, rep só lê

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Pipelines e tags</p>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Você tem acesso somente leitura às configurações. Apenas admin/manager podem editar.
        </div>
      )}

      <Tabs defaultValue="pipelines">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines" className="mt-4">
          <PipelinesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="tags" className="mt-4">
          <TagsTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Pipelines Tab ──
// Estágios são editados pelo mesmo <PipelineEditor> usado em DealsScreen —
// antes havia duas implementações divergentes (AUDITORIA-CODIGO.md §3.2).
function PipelinesTab({ canManage }: { canManage: boolean }) {
  const { data: pipelines, refresh: refreshPipelines } = usePipelines();
  const { data: stages, refresh: refreshStages } = useStages();
  const { data: lossReasons, refresh: refreshLossReasons } = useLossReasons();

  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newLossReason, setNewLossReason] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    setSelectedPipeline((prev) => prev || (pipelines.length ? pipelines[0].id : ""));
  }, [pipelines]);

  const addPipeline = async () => {
    if (!newPipelineName) return;
    const created = await createPipeline({ name: newPipelineName, is_default: pipelines.length === 0 });
    setNewPipelineName("");
    if (created?.id) setSelectedPipeline(created.id);
    refreshPipelines();
    toast.success("Pipeline criado");
  };

  const removePipeline = async (id: string) => {
    // estágios são apagados em cascata pela FK (on delete cascade)
    await deletePipeline(id);
    setSelectedPipeline("");
    refreshPipelines();
    refreshStages();
    toast.success("Pipeline excluído");
  };

  const addLossReason = async () => {
    if (!newLossReason) return;
    await createLossReason({ label: newLossReason });
    setNewLossReason("");
    refreshLossReasons();
    toast.success("Razão de perda adicionada");
  };

  const removeLossReason = async (id: string) => {
    await deleteLossReason(id);
    refreshLossReasons();
  };

  const pipelineStages = stages
    .filter((s) => s.pipeline_id === selectedPipeline)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipelines</CardTitle>
          <CardDescription className="text-[10px]">Gerencie seus pipelines de vendas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <Input placeholder="Nome do pipeline" value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" className="h-8 text-xs" onClick={addPipeline}><Plus className="mr-1 h-3 w-3" />Criar</Button>
            </div>
          )}
          {pipelines.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedPipeline && canManage && (
                <Button variant="destructive" size="sm" className="h-8 text-[10px]" onClick={() => removePipeline(selectedPipeline)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPipeline && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Estágios</CardTitle>
                <CardDescription className="text-[10px]">Estágios do pipeline selecionado.</CardDescription>
              </div>
              {canManage && (
                <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setEditorOpen(true)}>
                  <Settings2 className="mr-1 h-3.5 w-3.5" />Editar estágios
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {pipelineStages.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color || "#888" }} />
                <span className="text-xs font-medium flex-1">{s.name}</span>
                <Badge variant="outline" className="text-[8px]">{s.win_probability || 0}%</Badge>
                <span className="text-[9px] text-muted-foreground">#{s.sort_order}</span>
              </div>
            ))}
            {pipelineStages.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Nenhum estágio configurado</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Razões de Perda</CardTitle>
          <CardDescription className="text-[10px]">Motivos quando um negócio é marcado como perdido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <Input placeholder="Ex: Preço alto" value={newLossReason} onChange={(e) => setNewLossReason(e.target.value)} className="h-8 text-xs flex-1" />
              <Button size="sm" className="h-8" onClick={addLossReason}><Plus className="h-3 w-3" /></Button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {lossReasons.map((lr) => (
              <Badge key={lr.id} variant="secondary" className="text-[10px] gap-1">
                {lr.label}
                {canManage && <button onClick={() => removeLossReason(lr.id)} className="hover:text-destructive" aria-label="Remover"><X className="h-2.5 w-2.5" /></button>}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <PipelineEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        pipelineId={selectedPipeline}
        stages={stages.filter((s) => s.pipeline_id === selectedPipeline)}
        onSaved={refreshStages}
      />
    </div>
  );
}

// ── Tags Tab ──
function TagsTab({ canManage }: { canManage: boolean }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const fetchTags = useCallback(async () => {
    setTags(await listTags());
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      await createTag({ name: newTag.trim(), color: newColor });
      setNewTag("");
      fetchTags();
      toast.success("Tag criada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar tag");
    }
  };

  const removeTag = async (id: string) => {
    await deleteTag(id);
    fetchTags();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tags</CardTitle>
        <CardDescription className="text-[10px]">Etiquetas reutilizáveis para contatos e negócios</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canManage && (
          <div className="flex gap-2">
            <Input placeholder="Nome da tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} className="h-8 text-xs flex-1" />
            <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-10 h-8 p-0.5" aria-label="Cor" />
            <Button size="sm" className="h-8" onClick={addTag}><Plus className="h-3 w-3" /></Button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t.id} variant="secondary" className="text-[10px] gap-1" style={t.color ? { borderColor: t.color } : undefined}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color || "#888" }} />
              {t.name}
              {canManage && <button onClick={() => removeTag(t.id)} className="hover:text-destructive" aria-label="Remover"><X className="h-2.5 w-2.5" /></button>}
            </Badge>
          ))}
          {tags.length === 0 && <p className="text-xs text-muted-foreground py-2">Nenhuma tag criada</p>}
        </div>
      </CardContent>
    </Card>
  );
}
