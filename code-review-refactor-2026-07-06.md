# Code Review — Refatoração de Componentização (2026-07-06)

Revisão do diff gerado ao quebrar `DashboardScreen`, `ActivitiesScreen`, `DealsScreen`,
`ContactsScreen` em subcomponentes + adapter monetário nos repos. 8 agentes em paralelo
(correção, comportamento removido, cross-file, reuso, simplificação, eficiência, altitude,
convenções), achados deduplicados e verificados. 10 sobreviveram.

Nenhum destes é bloqueante — a build/testes passam. São itens pra revisar quando tiver tempo.

---

## Correção / consistência (prioridade alta)

### 1. `src/screens/DashboardScreen.tsx:133` — falsy-zero na meta mensal

```ts
return goal ? goal.target_value || DEFAULT_MONTHLY_REVENUE_GOAL : DEFAULT_MONTHLY_REVENUE_GOAL;
```

Usa `||` em vez de `??`. Se um usuário cadastrar uma meta com `target_value = 0`
(o formulário permite), o Dashboard ignora esse 0 real e cai no valor default —
o medidor "Meta do Mês" e o % de progresso ficam calculados contra a meta errada.

Bug pré-existente (a linha já tinha esse padrão antes de hoje, só perdeu o `Number()`
no meio da limpeza do adapter monetário), mas passou batido.

**Fix sugerido:**

```ts
return goal ? (goal.target_value ?? DEFAULT_MONTHLY_REVENUE_GOAL) : DEFAULT_MONTHLY_REVENUE_GOAL;
```

### 2. `Number(revenue)` redundante que sobrou da limpeza de hoje

- `src/screens/CompaniesScreen.tsx:249` — `formatRevenue(Number(c.revenue))`
- `src/screens/CompaniesScreen.tsx:276` — `formatRevenue(Number(c.revenue))` (dentro de `c.revenue && ...`)
- `src/components/crm/CompanyDrawer.tsx:166` — `formatCurrency(Number(company.revenue))` (dentro de `company.revenue && ...`)

`companies.repo.ts` já normaliza `revenue` pra `number | null` — esses 3 casts sobraram
porque o grep usado na limpeza original só pegava o padrão `Number(x) || 0`, não
`Number(x)` sozinho. Hoje é inofensivo (`Number(null) === 0`, e os dois sites tratam
`0`/`null` do mesmo jeito), mas contradiz a limpeza que eu disse ter terminado.

**Fix sugerido:** remover o `Number(...)` dos 3 sites — `c.revenue`/`company.revenue`
já são `number | null`.

---

## Limpeza / duplicação (prioridade menor — todos em arquivos criados hoje)

### 3. `isOverdue` duplicado

`src/components/crm/activities/ActivitiesTable.tsx:21` e
`src/components/crm/activities/ActivitiesCalendar.tsx:14` — mesma função copiada
verbatim. Mover pra `lib/date.ts` e importar dos dois lugares.

### 4. Cálculo de "dias desde X" reimplementado 4x

- `src/components/crm/contacts/ContactsTable.tsx:49` (`getInactivityDays`)
- `src/components/crm/dashboard/RiskDealsSection.tsx` (cálculo de `daysSince` inline)
- `src/lib/format.ts` já exporta `daysAgo` fazendo a mesma conta
- `src/lib/analytics.ts` tem uma variante equivalente em `dealPriority`

`RiskDealsSection.tsx` já importa de `lib/format.ts` pra outras coisas — a omissão
parece acidental. Vale unificar nas 4 chamadas.

### 5. Toggle de view-mode (pill segmentado) reimplementado 3x

`ActivitiesToolbar.tsx`, `ContactsToolbar.tsx`, `DealsToolbar.tsx` — cada um
reimplementa o mesmo padrão visual (`rounded-lg border bg-muted/50 p-0.5` +
estado ativo `bg-background text-foreground shadow-sm`), com 3 formas de código
ligeiramente diferentes. Candidato a um `<SegmentedToggle options={...} value
onChange />` compartilhado.

### 6. `LossReasonModal` não segue o padrão de `DealFormSheet`

`src/components/crm/deals/LossReasonModal.tsx` usa pares soltos
`lossReason`/`onLossReasonChange` + `lossNote`/`onLossNoteChange`, enquanto
`DealFormSheet.tsx` (mesma pasta, mesma sessão) já estabeleceu o padrão mais limpo
`form` + `onFormChange(patch)` pra um problema equivalente (rascunho de 2 campos).

### 7. Wrapper "vazio vs gráfico" duplicado 3x

`ActivitiesTypeChart.tsx`, `ActivitiesByDayChart.tsx`, `NewLeadsByStatusChart.tsx` —
o bloco `data.length > 0 ? <ResponsiveContainer>...</ResponsiveContainer> : <div vazio>`
se repete, variando só o gráfico interno. Os três já compartilham `chartTheme.ts`;
um `<ChartCard title empty={...}>{children}</ChartCard>` seria o próximo passo natural.

### 8. Lookups O(n·m) em loops de render

`ActivitiesTable.tsx` (`getContact`/`getCompany`/`getDeal`) e `ContactsTable.tsx`
(`companies.find(...)`) fazem `.find()` dentro do `.map()` de cada linha.
`ContactsTable.tsx` já recebe `lastActivityMap` como `Map` pronto — o mesmo padrão
deveria valer pra `companiesById`. Não é regressão nova, mas agora que essas tabelas
são componentes isolados que re-renderizam sozinhos, o custo é pago com mais frequência.

### 9. IIFE desnecessária em JSX

`src/components/crm/contacts/ContactsTable.tsx:97` — `{(() => { const days = ...
})()}` dentro do JSX da linha. Sem ganho sobre computar `const days = ...` uma vez
no topo do callback do `.map()`.

### 10. `DashboardKpiCards` com 10 props soltas

`src/components/crm/dashboard/DashboardKpiCards.tsx` recebe 10 props primitivas,
enquanto os irmãos criados na mesma sessão (`RiskDealsSection`, `TopDealsCard`,
`RevenueSection`) recebem um objeto coeso. Candidato a agrupar num `kpis: DashboardKpis`.
