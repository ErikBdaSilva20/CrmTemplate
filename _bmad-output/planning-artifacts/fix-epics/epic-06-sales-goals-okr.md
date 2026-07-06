---
epic: 6
title: Sales Goals — UI melhorada e metas atreladas a deal/empresa (OKR)
block: 'fix.md §6'
depends_on: [9]
enables: []
---

# Épico 06 — Sales Goals: interface OKR + vínculo a deal/empresa

## Objetivo

Em `/sales-goals`, **melhorar a interface** (mais elementos visuais) e permitir **atrelar uma meta a um deal
ou a uma empresa**, no conceito de **OKRs**.

## Contexto atual (código)

- `src/screens/SalesGoalsScreen.tsx` — metas por período (mês/ano), tipos `revenue/deals_closed/activities/new_contacts`,
  `target_value`, progresso calculado no front (`actuals` a partir de deals won/activities/contacts).
- `src/lib/data/salesGoals.repo.ts` — CRUD genérico; tipos derivam de `Database[...]["sales_goals"]`.
- Schema `sales_goals` (`0001_business_schema.sql:218`): `owner_id`, `goal_type`, `target_value`,
  `current_value`, `period_month`, `period_year`. **Sem** vínculo a deal/empresa.

## Mudança de dados (coordenar com Épico 09)

Adicionar colunas **aditivas nullable** em `sales_goals`:
- `deal_id uuid references deals(id) on delete set null`
- `company_id uuid references companies(id) on delete set null`
Espelhar em `src/lib/data/types.gen.ts`. **Nada é obrigatório** (metas globais continuam válidas).
`current_value` permanece **não** persistido como verdade — sempre agregado no front.

---

### Story 6.1: Schema — vínculo de meta a deal/empresa

Como **desenvolvedor**,
quero **`sales_goals` com `deal_id` e `company_id` opcionais**,
para que **uma meta possa ser atrelada a um negócio ou empresa** (OKR).

**Acceptance Criteria:**

**Given** `supabase/migrations/0001_business_schema.sql`
**When** aplico a alteração
**Then** `sales_goals` ganha `deal_id`/`company_id` nullable com FK `on delete set null`, de forma **idempotente**
(`add column if not exists`)
**And** `src/lib/data/types.gen.ts` reflete as novas colunas em Row/Insert/Update
**And** metas existentes (sem vínculo) continuam válidas (colunas nulas)
**And** o Épico 09 registra essa mudança como aditiva.

### Story 6.2: Vincular meta a um deal ou empresa (form)

Como **gestor**,
quero **escolher, ao criar/editar uma meta, vinculá-la a um deal, a uma empresa ou deixá-la global**,
para que **eu organize metas no estilo OKR**.

**Acceptance Criteria:**

**Given** o dialog de criar/editar meta
**When** eu preencho a meta
**Then** posso opcionalmente selecionar **um deal** (via `useDeals`) **ou** **uma empresa** (via `useCompanies`),
ou nenhum (meta global)
**And** o vínculo é salvo em `deal_id`/`company_id` (mutuamente coerente — não ambos ao mesmo tempo, salvo se o
produto permitir; padrão: um ou outro)
**And** a meta salva sem enviar `owner_id`.

### Story 6.3: Cálculo de progresso considerando o vínculo

Como **gestor**,
quero **o progresso da meta calculado no escopo do vínculo**,
para que **uma meta atrelada a uma empresa/deal meça só o que importa**.

**Acceptance Criteria:**

**Given** uma meta com `company_id` definido e `goal_type = revenue`
**When** a tela calcula o realizado
**Then** soma apenas deals **won** cujo `company_id` bate (no período), no front (nunca persistido)
**And** meta com `deal_id` mede o próprio deal (ex.: valor/won)
**And** meta global mantém o cálculo atual por período/owner
**And** os agregados continuam *list-then-filter* no front.

### Story 6.4: Melhorar a interface (OKR)

Como **gestor**,
quero **uma tela de metas mais rica visualmente**,
para que **eu leia progresso, projeção e status rapidamente**.

**Acceptance Criteria:**

**Given** metas do período
**When** abro `/sales-goals`
**Then** cada meta mostra **realizado vs. alvo vs. restante** e **% de progresso** (barra/anel), com badge de
**status** (no ritmo / atrás / atingida) e uma **projeção linear** de fechamento do período
**And** metas vinculadas exibem claramente o **objetivo-chave** (empresa/deal) ao qual pertencem (visual OKR:
objetivo → resultado-chave)
**And** os componentes seguem os tokens de tema do CellRM e reutilizam `Progress`/cards shadcn existentes
**And** *empty state* quando não há metas no período.

## Notas técnicas

- Reaproveitar `MonthYearSelect`, `Progress`, e o padrão de agregação já presente em `SalesGoalsScreen`.
- Coordenar Story 6.1 com o Épico 09 (schema + types).
