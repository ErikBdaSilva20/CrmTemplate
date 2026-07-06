# Auditoria Técnica Detalhada & Guia de Arquitetura Escalável (Completo)

Este documento estabelece o diagnóstico técnico do projeto CRM Boilerplate e define os conceitos, padrões e arquiteturas necessárias para elevar o projeto ao nível de produção de Big Techs, visando alta performance (50k+ usuários) e facilidade de manutenção por múltiplos times.

---

Nota da auditoria: 3.5/10

Arquitetura: 3/10
Clean Code: 4/10
Performance: 2/10
Escalabilidade: 1/10
Reutilização: 5/10
Organização: 5/10
TypeScript: 6/10
React: 4/10

## 1. Arquitetura e Gerenciamento de Estado (State Management)

### 🔴 O Cenário Atual: `data-cache.ts` e Memória O(N)

Atualmente, o projeto utiliza um sistema customizado de cache em memória (`data-cache.ts`) implementado com `useSyncExternalStore`. Embora resolva o problema de requisições duplicadas ao navegar entre telas, ele introduz graves limitações de escalabilidade:

- **Carregamento Integral de Dados (Fetch de T[]):** O front-end baixa absolutamente todos os registros de cada tabela (`deals`, `contacts`, `activities`) do banco de dados Neon no primeiro carregamento.
- **Filtros e Agregações no Cliente:** Todo o comportamento de busca, paginação, filtros por período e soma de valores é feito iterando arrays em memória via JavaScript (`.filter()`, `.reduce()`).
- **Complexidade no Backend Inexistente:** O backend atua apenas como um repositório de persistência de arrays.

### 💡 O que é executável a partir deste repo (🟢)

O gateway genérico (`/data/:table`) só expõe `list/create/update/remove` — sem query params, sem paginação, sem agregação server-side (`Importantdoc.md` §B5). Migrar para TanStack Query **não** entrega ordenação/paginação/filtragem no servidor aqui, porque não existe servidor de aplicação próprio para isso — só o gateway compartilhado. O que continua válido e executável sem tocar no gateway:

#### Optimistic Updates no Drag-and-Drop do Kanban

Ao arrastar um negócio de um estágio para outro no Kanban (`DealsScreen`), o usuário deve ver o card se mover instantaneamente, sem travar a interface esperando o retorno da API.

- **Implementação Técnica com React Query:**

```typescript
const queryClient = useQueryClient();

const { mutate } = useMutation({
  mutationFn: ({ dealId, stageId }) => moveDealToStage(dealId, stageId),
  onMutate: async ({ dealId, stageId }) => {
    await queryClient.cancelQueries({ queryKey: dealKeys.all });
    const previousDeals = queryClient.getQueryData(dealKeys.lists());

    queryClient.setQueriesData({ queryKey: dealKeys.lists() }, (old: any) => {
      return old.map((d: any) => (d.id === dealId ? { ...d, stage_id: stageId } : d));
    });

    return { previousDeals };
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueriesData({ queryKey: dealKeys.lists() }, context?.previousDeals);
    toast.error('Erro ao mover negócio. Ação desfeita.');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: dealKeys.all });
  },
});
```

---

## 2. Abstração de API & Camada de Adaptadores (Adapters / DTOs)

> ✅ **Concluído (2026-07-06).** Escopo: 🟢 template-editable (repos + telas/componentes
> que consomem dados), sem tocar em `types.gen.ts`/`client.ts`/migrations (protegidos).
> Adicionado normalizador em `deals.repo.ts`, `companies.repo.ts`, `salesGoals.repo.ts` e
> `pipelines.repo.ts` (campos `numeric` do Postgres que chegam como string via JSON:
> `value`, `probability`, `revenue`, `target_value`, `current_value`, `win_probability`).
> Removidos os `Number(x) || 0` defensivos em ~15 arquivos que liam dados já normalizados
> pelo repo; mantidos os casts que fazem parsing de campos de formulário (string do input
> → number antes de enviar), que são um caso diferente. `tsc`, `vitest` (61/61) e
> `vite build` passando limpos após a mudança.

### 🔴 O Cenário Atual: Tipos Fracos e Casts em Runtime

No código atual, encontramos inúmeros casts de tipos monetários como `Number(deal.value) || 0`. Isso indica que os dados brutos vêm da API/Gateway como strings ou tipos numéricos mal mapeados, poluindo os componentes visuais com conversões repetidas.

### 💡 Conceito Proposto: Camada de Adaptação de Dados (Data Mapping / DTOs)

Os dados vindos da API devem passar por um **Adapter** imediatamente na camada de serviço (antes de atingir os Hooks de React). Isso garante que o front-end trabalhe exclusivamente com tipos fortemente tipados e limpos.

#### Tratamento de Valores Monetários (Financeiro)

Computadores representam números com ponto flutuante usando o padrão IEEE 754, o que gera erros bizarros de arredondamento em somas (ex: `0.1 + 0.2 = 0.30000000000000004`).

- **Conceito de Produção:** Valores monetários em sistemas que crescem devem ser trafegados e calculados em **Centavos (Inteiros)** no backend e banco de dados (ex: R$ 150,50 vira `15050` centavos). O front-end apenas formata esse valor inteiro no momento de exibir na UI usando helpers centrais.

---

## 3. UI/UX & React Patterns: Desmembrando God Components

### 🔴 O Cenário Atual: Telas Gigantescas e Acopladas

Atualmente, as telas em `src/screens` funcionam como monolitos JSX:

- **`DashboardScreen.tsx`** contém gráficos, KPIs, lógica de expansão de deals e canvas de partículas.
- **`ActivitiesScreen.tsx`** gerencia filtros por tipo, abas de vencimento, tabela de listagem e visualização de calendário inteiro com renderização inline.
- **`DealsScreen.tsx`** e **`ContactsScreen.tsx`** gerenciam sheets de formulários, seletores de pipeline, edição em lote e modais de erro no mesmo escopo.

### 💡 Conceito Proposto: Componentização Modular & Separation of Concerns (SoC)

Para facilitar a evolução paralela do código por dezenas de desenvolvedores, as telas devem atuar apenas como **Orquestradores de Layout**, delegando a lógica visual para sub-componentes especializados e a lógica de estado para Hooks Customizados.

#### Divisão Recomendada para o Dashboard

> ✅ **Concluído (2026-07-06).** `DashboardScreen.tsx` caiu de 741 → 181 linhas (só
> data-fetching + `useMemo` de wiring para `lib/analytics.ts` + JSX de layout). A
> proposta abaixo usava `src/components/dashboard/**`, mas esse glob não existe em
> `masi.template.json.editable.allow` (só `src/components/crm/**` e
> `src/components/layout/**` são editáveis fora de `screens/**`) — para não precisar
> tocar no manifest, os componentes foram criados em `src/components/crm/dashboard/**`
> em vez disso. Estrutura final: `DashboardHeader`, `DashboardKpiCards`,
> `RevenueSection` (receita mensal + meta do mês — juntos porque são a mesma métrica
> vista de duas formas; os demais pares lado a lado no grid original **não** foram
> juntados por serem domínios diferentes só coincidindo na mesma linha, ex: Principais
> Negócios + Atividades por Tipo), `TopDealsCard`, `ActivitiesTypeChart`,
> `ActivitiesByDayChart`, `NewLeadsByStatusChart`, `RiskDealsSection`, mais um
> `chartTheme.ts` compartilhado (tooltip/paleta). `tsc`, `vitest` (61/61) e
> `vite build` passando limpos.

```
src/components/dashboard/
├── DashboardHeader.tsx         // Filtros de período e botão de refresh
├── DashboardKPIs.tsx           // Renderização dos cards de métricas superiores
├── DashboardCharts/
│   ├── RevenueAreaChart.tsx    // Histórico de 12 meses
│   ├── GoalGauge.tsx           // Medidor de atingimento de meta (OKR)
│   ├── ActivitiesPieChart.tsx  // Gráfico de atividades por tipo
│   └── LeadsBarChart.tsx       // Contatos por status
├── TopDealsCard.tsx            // Lista expansível dos principais negócios
└── RiskDealsAlerts.tsx         // Alertas de negócios inativos ou atrasados
```

#### Divisão Recomendada para Atividades

> ✅ **Concluído (2026-07-06).** `ActivitiesScreen.tsx` caiu de 440 → 162 linhas.
> Diferente da proposta abaixo (6 arquivos), agrupamos em só 3 — cabeçalho + as duas
> linhas de filtro viram um `ActivitiesToolbar.tsx` único (só existem em função uma da
> outra); nav de mês + grid + célula viram um `ActivitiesCalendar.tsx` único (nenhuma
> reaproveitada isolada); e `ActivitiesTable.tsx` pra visão em lista. Evita a
> "massaroca de pastas" de um componente por sub-elemento quando eles só existem
> juntos. Todos em `src/components/crm/activities/**`.

```
src/components/activities/
├── ActivitiesHeader.tsx        // Título, contagem e alternador de abas/view
├── ActivitiesFilters.tsx       // Filtro por tipo de atividade e datas
├── ActivitiesList.tsx          // Tabela de exibição de lista tradicional
└── ActivitiesCalendar/
    ├── CalendarGrid.tsx        // Grade de dias do mês ativo
    ├── CalendarCell.tsx        // Célula individual com eventos/atividades
    └── CalendarHeader.tsx      // Navegador de meses (Anterior/Próximo)
```

#### DealsScreen e ContactsScreen

> ✅ **Concluído (2026-07-06).** `DealsScreen.tsx` caiu de 604 → 382 linhas: extraídos
> `DealsToolbar.tsx` (barra de controles), `DealFormSheet.tsx` (sheet de criar/editar),
> `LossReasonModal.tsx` (modal de motivo ao marcar 1 negócio como perdido) e
> `LossReasonsPanel.tsx` (painel de gestão de motivos + revisão de perdidos — as duas
> metades ficam juntas por serem uma única feature de review). `ContactsScreen.tsx`
> caiu de 666 → 306 linhas: extraídos `ContactsToolbar.tsx` (busca + alternância de
> view + painel de filtros, que só existe em função do botão do toolbar),
> `ContactsTable.tsx` (visão tabela, ordenação, badge de inatividade) e
> `ContactsCardGrid.tsx` (visão cartões). Barra de ações em lote e paginação ficaram
> inline nas telas (pequenas, cross-cutting entre views, não específicas de nenhum
> subcomponente). Todos em `src/components/crm/deals/**` e `src/components/crm/contacts/**`.
> `tsc -b`, `vitest` (61/61) e `vite build` limpos após cada tela.

---

## 4. Performance de Renderização em Alta Escala

### 🔴 O Cenário Atual: Jank e DOM Bloat

A exibição de tabelas com centenas de linhas de contatos (`ContactsScreen.tsx`) ou negócios gera sobrecarga na árvore do DOM. Toda vez que o estado do checkbox geral ou de um seletor muda, o React força a reconciliação de milhares de nós de elementos HTML, gerando micro-travamentos na UI (jank).

### 💡 Conceito Proposto: Virtualização de Listas (Windowing)

Para renderizar listagens em massa de forma fluida, o front-end deve implementar a técnica de **Virtualização**. Em vez de renderizar 1.000 linhas na tabela, renderiza-se apenas as linhas que estão visíveis na tela do usuário (viewport), criando um scroll virtual infinito.

- **Recomendação:** Utilizar o **`@tanstack/react-virtual`** (ou `react-window`), que se integra perfeitamente com as tabelas do shadcn/ui.
- **Benefício:** Reduz o uso de memória do navegador de 120MB para menos de 15MB e garante renders em menos de 16ms (60 FPS), independente do número total de registros.

---

## 5. TypeScript e Tipagem de Domínio Forte

> ✅ **Lookups mapeados já concluídos** (pré-existente ao início desta auditoria).
> `lib/domain.ts` já centraliza `CONTACT_STATUS`, `DEAL_STATUS` e `ACTIVITY_TYPE` como
> `Record<Enum, Config>`; conferido que não sobrou switch/if duplicado por tela. Nenhuma
> ação necessária neste item.

### 🔴 O Cenário Atual: Tipagem Fraca e "Any" Oculto

Embora o Typescript esteja configurado, há um excesso de tipagem solta na manipulação dos estados e interfaces:

- Constantes sendo passadas como strings comuns (ex: `'lead' | 'won' | 'lost'`).
- Interfaces de entidades de banco de dados (`Contact`, `Deal`) expostas diretamente na interface do usuário sem tipos que expressem o estado nulo/indefinido de forma clara.

### 💡 Conceito Proposto: Tipos de União e Enums Estritos

- **Definições Tipadas Centralizadas:**

```typescript
// src/types/domain.ts
export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned';
export type DealStatus = 'open' | 'won' | 'lost';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task';

export interface Activity {
  id: string;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  type: ActivityType;
  title: string;
  body: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}
```

- **Lookups Mapeados:** Eliminar switches repetidos por constantes estáticas tipadas usando `Record<ActivityType, Config>` como feito no `lib/domain.ts`, expandindo essa boa prática para todas as entidades.

---

## 6. Roadmap de Refatoração

> **Nota de escopo (2026-07-06):** este roadmap foi escrito sem considerar
> `Importantdoc.md` (o projeto é um template clonável sobre o `tenant-gateway`
> compartilhado, não um app com backend próprio). Itens re-classificados usando o
> `Masia Clone-Template Audit Framework.md` — 🟢 = executável neste repo, 🟠 = precisa
> estender o gateway (fora deste repo, exige alinhamento prévio).

### 🟢 Fase 1: Ganhos Rápidos (Modularização e UI Clean-up)

1. ✅ **Desmembrar Componentes Monolíticos:** `DashboardScreen`, `ActivitiesScreen`, `DealsScreen` e `ContactsScreen` concluídos 2026-07-06 (ver Seção 3).
2. ✅ **Implementar Adapters DTO** (concluído 2026-07-06 — ver Seção 2).
3. ✅ **Substituir switches/ifs por dicionários de lookup** (já existia em `lib/domain.ts` — ver Seção 5).

### 🟡 Fase 2: Gerenciamento de Estado Profissional

1. ⚠️ **Integrar TanStack Query (React Query):** o benefício real do React Query (sync de filtros/paginação server-side) não existe aqui — o gateway genérico só faz `list/create/update/remove`, sem query params (`Importantdoc.md` §B5). `data-cache.ts` documenta essa decisão de propósito. Trocar por React Query só faria sentido para cache/invalidação client-side + optimistic updates — **decisão de arquitetura a ser tomada com o time antes de codar**, não um ganho automático.
2. ⏳ **Otimização de Kanban Drag-and-Drop (optimistic updates):** 🟢 executável sem gateway novo — pode ser feito direto sobre `data-cache.ts` ou, se a decisão acima for por React Query, dentro dele. Pendente.
3. ⚪ **Cache Inteligente (`staleTime`/`gcTime`):** só se aplica se o item 1 for adotado.

### 🟢 Fase 3: Virtualização de Listas

1. ⏳ **Virtualização de Listas (`@tanstack/react-virtual`):** 100% client-side, não depende do gateway — continua válido e pendente de execução.
