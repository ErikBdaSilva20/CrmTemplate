import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Activity, ActivityType } from '@/lib/data';
import { ACTIVITY_TYPE, ACTIVITY_TYPES } from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import { useState } from 'react';

type NewActivity = { type: ActivityType; title: string; body: string };
const EMPTY_ACTIVITY: NewActivity = { type: 'note', title: '', body: '' };

interface DealActivityTimelineProps {
  activities: Activity[];
  onAdd: (activity: NewActivity) => Promise<void>;
}

// Form de nova atividade + timeline — form owns seu próprio rascunho e só
// reporta pro orquestrador quando o usuário confirma (mesmo padrão do
// DealDetailHeader: estado transiente de UI fica no componente filho).
export function DealActivityTimeline({ activities, onAdd }: DealActivityTimelineProps) {
  const [form, setForm] = useState<NewActivity>(EMPTY_ACTIVITY);

  const submit = async () => {
    if (!form.title) return;
    await onAdd(form);
    setForm(EMPTY_ACTIVITY);
  };

  return (
    <div className="lg:col-span-2 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Adicionar Atividade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ActivityType })}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ACTIVITY_TYPE[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-sm"
              placeholder="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Descrição (opcional)"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={2}
            className="text-sm"
          />
          <Button size="sm" onClick={submit} disabled={!form.title}>
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-1">
        {activities.map((a) => {
          const Icon = ACTIVITY_TYPE[a.type].icon;
          return (
            <div key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{ACTIVITY_TYPE[a.type].label}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                </div>
                <p className="text-sm font-medium">{a.title}</p>
                {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Nenhuma atividade registrada
          </div>
        )}
      </div>
    </div>
  );
}
