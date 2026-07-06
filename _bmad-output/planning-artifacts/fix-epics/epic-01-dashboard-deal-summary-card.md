---
epic: 1
title: Dashboard — Card de Deals com componente reutilizável de informações
block: 'fix.md §1'
depends_on: []
enables: [4]
---

# Épico 01 — Dashboard: card de deals (lista expansível) + componente reutilizável

## Objetivo

Substituir, na `DashboardScreen`, o card **"Pipeline por Estágio"** por um card **novo** que traz uma
**lista expansível de até 4 deals** vindos de `/deals`, exibindo para cada um: **BANT**, **contato**,
**empresa**, **fechamento** (valor/data/status) e **atividades**. Toda a exibição das informações do deal
deve usar um **componente reutilizável** (`EntityInfoCard`), que será reaproveitado no Kanban (Épico 04).

## Contexto atual (código)

- `src/screens/DashboardScreen.tsx:497` — grid com o card `Pipeline por Estágio` (`funnelData`, barras por
  estágio, já **expansível** por conta do trabalho anterior — commit `6baff81`). Este é o card a ser **trocado**.
- `src/components/crm/DealQualification.tsx` — exporta `DealQualification` (stateful), e os presentacionais
  `QualificationBar`, `LeadScoreBadge`, `getScoreColor`, `getProgressColor`.
- `useDeals`, `useActivities`, `useContacts`, `usePipelines/useStages` já são carregados na tela.
- `DealWithRelations` (via `enrichDeals`) já cruza `company`/`contact`/`stage` no front.

## Decisão de escopo

- **Destino do card antigo:** o "Pipeline por Estágio" expansível **não** é o que o `fix.md` pede. Opção
  padrão: **substituir** (remover as barras por estágio e colocar o card de deals no lugar). Se o usuário
  quiser manter os dois, o card novo entra como um segundo card no mesmo grid `lg:grid-cols-2`.
- **"até 4 deals":** priorizar por relevância (maior `qualification_score`, depois maior `value`, depois
  `close_date` mais próxima). Mostrar "+N mais" com link para `/deals`, no mesmo padrão do `computeStageDeals`.
- **Atividades no card:** *list-then-filter* de `activities` por `deal_id` (sem get-by-id/join), mais recentes
  primeiro, com *empty state*.

---

### Story 1.1: Extrair helpers presentacionais de qualificação

Como **desenvolvedor**,
quero **os componentes presentacionais de BANT (`QualificationBar`, `LeadScoreBadge`, `getScoreColor`,
`getProgressColor`) fora do módulo stateful `DealQualification.tsx`**,
para que **Dashboard e Kanban possam reutilizá-los sem arrastar `useState`/`updateDeal`/`toast` nem arriscar
import circular** (pendência registrada em `deferred-work.md`).

**Acceptance Criteria:**

**Given** que `QualificationBar`/`LeadScoreBadge`/`getScoreColor`/`getProgressColor` hoje moram em `DealQualification.tsx`
**When** eu crio `src/components/crm/QualificationBar.tsx` com esses exports presentacionais
**Then** `DealQualification.tsx`, `DealsKanban.tsx` e o novo `EntityInfoCard` importam do novo arquivo
**And** nenhum comportamento visual muda e `tsc && vite build` passa limpo sem imports órfãos.

### Story 1.2: Criar `EntityInfoCard` (componente reutilizável de deal)

Como **admin/vendedor**,
quero **um componente único que resuma um deal (BANT, contato, empresa, fechamento e atividades)**,
para que **a mesma exibição seja usada no Dashboard e no Kanban sem duplicar markup**.

**Acceptance Criteria:**

**Given** um `DealWithRelations` e a lista de `activities`
**When** renderizo `<EntityInfoCard deal={...} activities={...} />`
**Then** o card mostra: título do deal; **empresa** (`deal.company?.name`); **contato**
(`first_name last_name`); **fechamento** (valor formatado, `close_date`, badge de `status` open/won/lost);
**BANT** via `QualificationBar` (só quando avaliado); e uma **mini-timeline** das últimas atividades do deal
(ícone por `type`, título, data), com *empty state* "Sem atividades"
**And** clicar no card/título navega para `/deals/:id`
**And** o componente é puramente presentacional (recebe dados por props; sem chamadas a `db`)
**And** segue os tokens de tema do CellRM (não introduz cores hardcoded fora de `src/index.css`).

### Story 1.3: Trocar o card do Dashboard pela lista de deals

Como **admin**,
quero **ver no Dashboard os principais deals já registrados em `/deals`, expansíveis, com todas as
informações relevantes**,
para que **eu acompanhe o pipeline sem sair da home**.

**Acceptance Criteria:**

**Given** que existem deals para o usuário
**When** abro o Dashboard
**Then** no lugar do card "Pipeline por Estágio" há um card com **até 4 deals** ordenados por relevância
(`qualification_score` desc → `value` desc → `close_date` asc)
**And** cada item é expansível e, expandido, renderiza o `EntityInfoCard` daquele deal
**And** há um indicador "+N mais" com atalho `Ver pipeline → /deals`
**And** quando não há deals, aparece um *empty state* ("Nenhum negócio ainda")
**And** o card antigo de barras por estágio é removido do JSX (ou mantido como segundo card, conforme decisão
de escopo) e nenhuma função/estado órfão (`funnelData`, `computeStageDeals`, `expandedStages`) fica sem uso.

### Story 1.4: Testes das funções de seleção/ordenação

Como **desenvolvedor**,
quero **cobertura da lógica de seleção dos "top 4 deals"**,
para que **a ordenação por relevância não regrida**.

**Acceptance Criteria:**

**Given** uma lista de deals com scores/valores/datas variados
**When** aplico a função de seleção (pura, extraída para `src/lib/analytics.ts` no padrão de `computeStageDeals`)
**Then** ela retorna no máximo 4 itens na ordem esperada
**And** o teste roda em `src/lib/analytics.test.ts` e passa.

## Notas técnicas

- Reaproveitar o padrão de `computeStageDeals`/`FunnelStage` (`src/lib/analytics.ts`) para a função de seleção.
- Não usar get-by-id: atividades por `activities.filter(a => a.deal_id === deal.id)`.
- Arquivos protegidos não podem ser alterados como código de app: `client.ts`, `types.gen.ts` (exceto no
  Épico 09), `auth.tsx`, `components/ui/**`, `utils.ts`, `main.tsx`, migrations.
