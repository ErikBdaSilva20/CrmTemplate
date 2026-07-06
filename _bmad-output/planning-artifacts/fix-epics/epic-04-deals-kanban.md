---
epic: 4
title: Deals — Kanban de gestão com status, BANT e priorização
block: 'fix.md §4'
depends_on: [1, 7]
enables: []
---

# Épico 04 — Deals: Kanban de gestão (ativos, status, BANT, priorização)

## Objetivo

Na tela Kanban de `/deals`, mostrar **todos os deals ativos** para gestão fácil e rápida, com **status** e
informações de **BANT** (parecido com o Dashboard, porém com **mais detalhes**), **priorizando a facilidade de
deduzir qual negócio precisa de atenção prioritária**.

## Contexto atual (código)

- `src/components/crm/DealsKanban.tsx` — Kanban por estágio (`@dnd-kit`), `DealCard` já mostra
  `QualificationBar` (BANT) — commit `e6ea838`. Won/Lost em `CollapsibleStatusColumn` **sem** BANT
  (`deferred-work.md`).
- `src/screens/DealsScreen.tsx` — `viewMode` kanban|list; `openDeals` = `status === "open"` alimenta o Kanban
  (linhas ~207–304). Também tem dropdown **"Segmentos"** (linhas ~265–288) → remover (Épico 07).
- `src/screens/DealDetailScreen.tsx` — pendências: `<Select>` de estágio não gated por status;
  `markAsWon`/`confirmLoss`/`reopenDeal` sem try/catch nem guard (`deferred-work.md`).

## Definições

- **"Deals ativos"** = `status === "open"` (Won/Lost são histórico). O Kanban de gestão foca em open.
- **Priorização** = destacar visualmente o deal que precisa de atenção, combinando: BANT alto/baixo,
  `close_date` próxima/vencida, e **stale** (sem atividade recente). Ver Story 4.3.

---

### Story 4.1: Card de deal do Kanban com mais detalhes

Como **admin**,
quero **cards de deal no Kanban com status, BANT e dados-chave (empresa, contato, valor, fechamento)**,
para que **eu gerencie o pipeline de forma rápida sem abrir cada deal**.

**Acceptance Criteria:**

**Given** deals abertos distribuídos por estágio
**When** vejo o Kanban
**Then** cada card mostra: título, empresa, contato, valor formatado, `close_date`, badge de status e a
`QualificationBar` (BANT) — reaproveitando a `QualificationBar` extraída no Épico 01 (Story 1.1)
**And** o nível de detalhe é maior que o do Dashboard, mantendo consistência visual com o `EntityInfoCard`
**And** arrastar entre colunas segue movendo o `stage_id` como hoje (otimista + confirmação do gateway).

### Story 4.2: BANT nos cards Won/Lost (pendência herdada)

Como **admin**,
quero **ver o score BANT também nos cards de deals Ganhos/Perdidos**,
para que **a leitura retrospectiva de qualificação seja possível** (item de `deferred-work.md`).

**Acceptance Criteria:**

**Given** as colunas colapsáveis Won/Lost (`CollapsibleStatusColumn`)
**When** expando uma delas
**Then** cada card compacto exibe a `QualificationBar` quando o deal foi avaliado
**And** o layout apertado do grid de cards pequenos continua legível.

### Story 4.3: Sinalização de prioridade ("precisa de atenção")

Como **admin**,
quero **identificar de relance quais deals precisam de atenção prioritária**,
para que **eu aja primeiro nos negócios certos**.

**Acceptance Criteria:**

**Given** deals abertos
**When** vejo o Kanban
**Then** cada card recebe um indicador de prioridade derivado de regras claras: `close_date` vencida/≤7 dias
(urgente), sem atividade há > N dias (stale), e BANT baixo em deal de alto valor (risco)
**And** deals urgentes/stale têm destaque visual (borda/badge/ícone) e/ou ordenação no topo da coluna
**And** a lógica de prioridade é uma **função pura** testável (ex.: `dealPriority(deal, activities, now)` em
`src/lib/analytics.ts`) com cobertura em `analytics.test.ts`
**And** o critério trata `qualification_score === 0` como "não avaliado" (não como "desqualificado") para não
marcar falsamente como risco — ou documenta a limitação (`deferred-work.md`).

### Story 4.4: Higiene do fluxo de status do deal (pendências)

Como **desenvolvedor**,
quero **as mutações de status protegidas e o `<Select>` de estágio coerente com o status**,
para que **won/lost seja um estado revisável sem inconsistência** (itens de `deferred-work.md`).

**Acceptance Criteria:**

**Given** `DealDetailScreen`
**When** um deal está `won`/`lost`
**Then** o `<Select>` de estágio respeita o mesmo gate dos cliques da barra de progresso (ou é explicitamente
permitido de forma consistente)
**And** `markAsWon`, `confirmLoss` e `reopenDeal` têm `try/catch` + `toast.error` e desabilitam o botão
enquanto a request está em voo (sem duplo-clique disparando requests duplicadas)
**And** o comportamento fica alinhado ao padrão já correto de `DealsScreen.tsx`.

### Story 4.5: Remover dropdown de segmentos do DealsScreen

Como **usuário**,
quero **o Kanban de deals sem "Filtros Salvos/Segmentos"**,
para que **a tela fique consistente com a remoção de segmentos** (Épico 07).

**Acceptance Criteria:**

**Given** `DealsScreen`
**When** renderizada
**Then** não há dropdown de segmentos nem `useSegments`/`applySegment`/`activeSegmentId`
**And** os demais filtros do Kanban seguem funcionando
**And** `tsc && vite build` limpo.

## Notas técnicas

- Sem schema novo (deals já tem `qualification`/`qualification_score`/`status`/`close_date`).
- Reusar `enrichDeals`/`DealWithRelations` e a `QualificationBar` extraída (Épico 01).
