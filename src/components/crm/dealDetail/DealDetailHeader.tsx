import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Deal, PipelineStage } from '@/lib/data';
import { formatCurrency } from '@/lib/format';
import { ArrowLeft, Check, Edit2, RotateCcw, Trophy, X, XCircle } from 'lucide-react';
import { useState } from 'react';

// Cabeçalho editável do detalhe do negócio: título/valor inline-edit, seletor
// de estágio, indicador de saúde, ações de status e a barra de progresso do
// pipeline. Estado de edição (title/value drafts) é local — só reporta pro
// orquestrador (DealDetailScreen) quando o usuário confirma o save.
interface DealDetailHeaderProps {
  deal: Deal;
  currentStage: PipelineStage | undefined;
  orderedStages: PipelineStage[];
  currentStageIndex: number;
  healthColor: string;
  healthLabel: string;
  statusActionPending: boolean;
  onBack: () => void;
  onSaveTitle: (title: string) => void;
  onSaveValue: (value: number, currency: string) => void;
  onChangeStage: (stageId: string) => void;
  onMarkWon: () => void;
  onOpenLossModal: () => void;
  onReopenDeal: () => void;
}

export function DealDetailHeader({
  deal,
  currentStage,
  orderedStages,
  currentStageIndex,
  healthColor,
  healthLabel,
  statusActionPending,
  onBack,
  onSaveTitle,
  onSaveValue,
  onChangeStage,
  onMarkWon,
  onOpenLossModal,
  onReopenDeal,
}: DealDetailHeaderProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(deal.title);
  const [editingValue, setEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState(String(deal.value || 0));
  const [currencyDraft, setCurrencyDraft] = useState(deal.currency || 'BRL');

  const startEditTitle = () => {
    setTitleDraft(deal.title);
    setEditingTitle(true);
  };
  const saveTitle = () => {
    if (!titleDraft.trim()) return;
    onSaveTitle(titleDraft);
    setEditingTitle(false);
  };

  const startEditValue = () => {
    setValueDraft(String(deal.value || 0));
    setCurrencyDraft(deal.currency || 'BRL');
    setEditingValue(true);
  };
  const saveValue = () => {
    onSaveValue(Number(valueDraft) || 0, currencyDraft);
    setEditingValue(false);
  };

  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Negócios
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {/* Título */}
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="text-xl font-bold h-auto py-0.5"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              />
              <button onClick={saveTitle} className="shrink-0 text-success">
                <Check className="h-5 w-5" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="shrink-0 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <h1
              className="text-xl font-bold tracking-tight group cursor-pointer sm:text-2xl"
              onClick={startEditTitle}
            >
              {deal.title}
              <Edit2 className="ml-2 inline h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
            </h1>
          )}

          {/* Valor + estágio + saúde — wrap no mobile */}
          <div className="flex flex-wrap items-center gap-2">
            {editingValue ? (
              <>
                <Select value={currencyDraft} onValueChange={setCurrencyDraft}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={valueDraft}
                  onChange={(e) => setValueDraft(e.target.value)}
                  className="w-28 h-8"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveValue()}
                />
                <button onClick={saveValue} className="text-success">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingValue(false)} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <span
                className="text-lg font-bold text-primary cursor-pointer hover:opacity-80 sm:text-xl"
                onClick={startEditValue}
              >
                {formatCurrency(deal.value, deal.currency || 'BRL')}
              </span>
            )}

            <Select value={deal.stage_id || ''} onValueChange={onChangeStage} disabled={deal.status !== 'open'}>
              <SelectTrigger className="h-8 w-40">
                <div className="flex items-center gap-1.5">
                  {currentStage?.color && (
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: currentStage.color }} />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {orderedStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${healthColor}`} />
              <span className="text-xs text-muted-foreground">{healthLabel}</span>
            </div>

            {deal.status !== 'open' && (
              <Badge
                variant="secondary"
                className={deal.status === 'won' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
              >
                {deal.status === 'won' ? 'Ganho' : 'Perdido'}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {deal.status !== 'won' && (
            <Button
              variant="outline"
              onClick={onMarkWon}
              disabled={statusActionPending}
              className="flex-1 text-success border-success/30 hover:bg-success/10 sm:flex-none"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Ganho
            </Button>
          )}
          {deal.status !== 'lost' && (
            <Button
              variant="outline"
              onClick={onOpenLossModal}
              disabled={statusActionPending}
              className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 sm:flex-none"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Perdido
            </Button>
          )}
          {deal.status !== 'open' && (
            <Button
              variant="outline"
              onClick={onReopenDeal}
              disabled={statusActionPending}
              className="flex-1 text-muted-foreground border-border hover:bg-muted sm:flex-none"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline progress bar */}
      <div className="flex gap-1">
        {orderedStages.map((s, i) => (
          <div
            key={s.id}
            className={`h-2 flex-1 rounded-full transition-colors cursor-pointer ${
              i <= currentStageIndex
                ? deal.status === 'won'
                  ? 'bg-success'
                  : deal.status === 'lost'
                    ? 'bg-destructive'
                    : 'bg-primary'
                : 'bg-muted'
            }`}
            onClick={() => deal.status === 'open' && onChangeStage(s.id)}
            title={s.name}
          />
        ))}
      </div>
    </>
  );
}
