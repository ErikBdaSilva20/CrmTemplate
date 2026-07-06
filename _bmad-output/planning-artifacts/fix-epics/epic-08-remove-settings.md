---
epic: 8
title: Remover Settings — tela e código por completo
block: 'fix.md §8'
depends_on: []
enables: []
decision_required: true
---

# Épico 08 — Remover /settings (tela + código)

## Objetivo

Remover **por completo** a tela `/settings` e seu código, como pedido no `fix.md`.

## ⚠️ Decisão necessária antes de executar

A `SettingsScreen` **não é** uma tela "vazia": ela hoje concentra **configuração de Pipelines, Tags e Loss
Reasons** (`src/screens/SettingsScreen.tsx` — `Tabs` "Pipelines"/"Tags", usa `PipelineEditor`, `usePipelines`,
`useLossReasons`, `createTag/deleteTag`, `createLossReason/deleteLossReason`).

Removê-la simplesmente **retira do produto**:
- **Gestão de Tags** (criar/excluir tags) — não há outra tela para isso hoje.
- **Gestão de Loss Reasons** (motivos de perda) — idem.
- **Criar/excluir Pipelines** — a *edição de estágios* (`PipelineEditor`) também é acessível pelo Dialog de
  pipeline no `DealsScreen` (`pipelineDialogOpen`), mas **criar/apagar pipeline** e a aba de Tags/Loss Reasons
  vivem só em Settings.

**Opções (escolher uma):**

1. **Remover tudo** (Tags/Loss Reasons/Pipelines config saem do produto). Cumpre o `fix.md` ao pé da letra,
   mas o vendedor perde a gestão de tags/motivos de perda. Loss Reasons ainda é consumido no fluxo de
   "marcar como perdido" (Deals) — sem tela de gestão, fica só o que existir no banco/seed.
2. **Remover a rota `/settings`, mas realocar** Pipelines/Tags/Loss Reasons para onde já faz sentido
   (ex.: dentro do Dialog de pipeline do `DealsScreen`, ou um Drawer de config em Deals). Cumpre "sem tela
   `/settings`" sem perder capacidade. **(Recomendado)**
3. **Remover só o que o fix pede e manter a config** em outro lugar mínimo.

> Enquanto a decisão não for tomada, executar apenas o que é seguro (rota/nav/tela) **depois** de garantir o
> destino de Tags/Loss Reasons. As stories abaixo assumem a **Opção 2** por padrão; ajustar se o usuário
> escolher a Opção 1.

## Superfície de remoção (grep confirmado)

- `src/screens/SettingsScreen.tsx` — **deletar** (após realocar config, se Opção 2).
- `src/App.tsx` — `const SettingsScreen = lazy(...)` + `<Route path="/settings" ...>` → **remover**.
- `src/components/layout/AppSidebar.tsx:44` — `adminItems = [{ title: 'Configurações', url: '/settings', icon: Settings }]`
  → **remover** (e o import `Settings` se órfão).
- `src/components/layout/AppHeader.tsx`, `MobileBottomNav.tsx` — links para `/settings` → **remover**.
- `src/lib/constants.ts` — referências a settings → revisar/remover.
- **Não deletar** `PipelineEditor.tsx`, `usePipelines`, `useLossReasons`, repos de tags/loss_reasons/pipelines
  se a Opção 2 for escolhida (eles são reutilizados no destino).

---

### Story 8.0: (Se Opção 2) Realocar config de Pipelines/Tags/Loss Reasons

Como **admin**,
quero **continuar gerenciando pipelines, tags e motivos de perda mesmo sem a tela `/settings`**,
para que **remover Settings não tire capacidades do produto**.

**Acceptance Criteria:**

**Given** que `/settings` será removida
**When** eu preciso gerenciar pipelines/tags/loss reasons
**Then** essa gestão está disponível a partir do fluxo de Deals (ex.: Dialog/Drawer de configuração já existente)
**And** `PipelineEditor` e os CRUDs de tags/loss reasons continuam funcionando no novo local
**And** nenhuma capacidade de configuração é perdida.

> Se o usuário escolher a **Opção 1**, esta story vira "aceitar a perda de gestão de Tags/Loss Reasons" e é
> apenas documentada (sem realocação).

### Story 8.1: Remover a tela e a rota de Settings

Como **usuário**,
quero **`/settings` fora do app**,
para que **não haja tela morta**.

**Acceptance Criteria:**

**Given** o app
**When** navego para `/settings`
**Then** a rota não existe mais (cai no `NotFoundScreen`)
**And** `SettingsScreen.tsx` foi deletado e removido do `App.tsx`.

### Story 8.2: Remover navegação para Settings

Como **usuário**,
quero **os menus sem "Configurações"**,
para que **a navegação reflita a remoção**.

**Acceptance Criteria:**

**Given** sidebar, header e bottom nav
**When** renderizados
**Then** não há item apontando para `/settings`
**And** o `adminItems` vazio é tratado (não renderiza seção vazia) e imports órfãos (`Settings`) são removidos
**And** `src/lib/constants.ts` não referencia mais settings
**And** `tsc && vite build` passa limpo.

## Notas

- **Sem mudança de schema** neste épico (Pipelines/Tags/Loss Reasons permanecem no banco; só muda de onde são
  gerenciados). Se a Opção 1 for escolhida e o usuário quiser **apagar** tags/loss_reasons do schema, isso vira
  uma story no Épico 09 — mas o `fix.md` não pede remover essas tabelas, então **por padrão elas ficam**.
