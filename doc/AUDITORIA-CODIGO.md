# Auditoria de Código — CellRm / FlowCRM (template MasIA)

> **Escopo:** varredura completa de `src/`, schema (`supabase/migrations/`), configs e manifest.
> **Data:** 2026-07-03
> **Referência de contrato:** `Importantdoc.md` (Guia do time — Apps Prontos).
> **Veredito geral:** o **contrato com o gateway está sólido**. Os problemas são de
> **organização, duplicação e arquitetura de dados no front** — nenhum quebra a fundação,
> mas vários geram retrabalho, bugs sutis e dívida técnica.

---

## 0. O que está CORRETO (não mexer)

Antes das pendências, o que já segue o `Importantdoc.md` à risca:

- ✅ **Zero Supabase / Firebase / fetch cru pro banco / auth próprio.** Acesso só via `db`/`auth` (`client.ts`).
- ✅ **`owner_id text not null references "user"(id) on delete cascade`** em **toda** tabela escrita pelo rep — **inclusive filhas** (`contact_tags`, `deal_tags`). §B4.1 respeitado.
- ✅ **Sem RLS, sem `auth.uid()`, sem `profiles`, sem `SECURITY DEFINER`.** Autz delegada ao gateway.
- ✅ **`snake_case` minúsculo**, sem nomes de tabela reservados, `id uuid` PK + `created_at`/`updated_at` com trigger `touch_updated_at`.
- ✅ **`owner_id` nunca é enviado do front** (comentado e cumprido em todos os repos/telas).
- ✅ **List-then-filter no front** (sem `GET /data/:table/:id`, sem depender de join). `enrichDeals`, `tagsForContact`, etc. resolvem relações no cliente.
- ✅ **Arquivos protegidos intactos**: `client.ts`, `types.gen.ts`, `auth.tsx`, `ui/**`, `utils.ts`, `main.tsx`, migrations.
- ✅ **SPA Vite + React 19 + react-router-dom 7**, sem Next/SSR. `tsconfig` strict com `noUnusedLocals`/`noUnusedParameters`. Rotas com `lazy` + `Suspense`.
- ✅ **Repos** (`src/lib/data/*.repo.ts`) minúsculos, coesos e bem tipados — a **melhor camada do projeto**.

---

## 1. Arquitetura de dados no front — **ALTA prioridade**

O maior problema estrutural. Não viola o contrato, mas é a raiz de lentidão e re-fetch em cascata.

### 1.1 — Não existe camada de cache / estado compartilhado

`src/hooks/` só tem `use-mobile.tsx`. **Não há nenhum hook de dados.** Cada tela busca **tabelas inteiras** por conta própria, no `useEffect`, sem cache entre telas:

| Tela               | Tabelas buscadas por montagem (`Promise.all`)                                               |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `DashboardScreen`  | deals, stages, activities, contacts, pipelines (**+ auto-refetch a cada 5 min**, linha 131) |
| `DealsScreen`      | deals, stages, pipelines, contacts, companies, segments                                     |
| `ActivitiesScreen` | activities, contacts, companies, deals                                                      |
| `ContactsScreen`   | contacts, companies, activities, segments                                                   |
| `SalesGoalsScreen` | goals, deals, activities, contacts                                                          |
| `TasksScreen`      | tasks, contacts, deals                                                                      |

Navegar Dashboard → Deals → Contatos re-baixa `contacts`/`deals` 3×. São **40 pontos** de `fetchData`/`useEffect` espalhados (grep confirmado).

**Impacto:** latência acumulada, tráfego redundante, telas "piscando" a cada navegação, e lógica de fetch copiada N vezes.

**Correção sugerida:** introduzir uma camada de query compartilhada. Duas opções conformes ao contrato (não tocam em arquivos protegidos):

- Hooks próprios em `src/hooks/` (`useDeals`, `useContacts`, …) com cache em memória + invalidação simples; **ou**
- Uma lib leve de cache (ex.: um `QueryClient` mínimo próprio). Evite libs pesadas não justificadas (§B3).
  `src/hooks/**` já está em `editable.allow` do manifest — é o lugar certo.

### 1.2 — `getX` = full-table fetch; `DealDetailScreen` faz waterfall

`getDeal`/`getContact`/`getCompany` (repos) são `list().find()` — **baixam a tabela inteira** para achar 1 registro (esperado no modo genérico). Mas `DealDetailScreen` (linhas 61/75/76) encadeia **em sequência**:

```
getDeal(id)      // baixa TODOS os deals
 → getContact()  // baixa TODOS os contacts
 → getCompany()  // baixa TODAS as companies
```

Três varreduras completas **sequenciais** (waterfall). Deveriam ser paralelas (`Promise.all` de `listDeals/listContacts/listCompanies` e cruzar no front, como as outras telas já fazem).

---

## 2. Arquivos gigantes / concerns misturados — **MÉDIA-ALTA**

Telas que acumulam UI + lógica de negócio + sub-componentes no mesmo arquivo. `Importantdoc` pede código compilável e organizado; estes passam do razoável (>300 linhas):

| Arquivo                        | Linhas  | Problema                                                                                                                                                                             |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `screens/ActivitiesScreen.tsx` | **675** | Tela + `ActivityCreateEditModal` (190 linhas) + helpers de data (`startOfDay`/`getWeekRange`) + view calendário, tudo junto.                                                         |
| `screens/DashboardScreen.tsx`  | **610** | ~10 `useMemo` de **analytics** (funnel, receita mensal, ciclo médio, at-risk, variação período) embutidos na tela + `GaugeChart` inline. Lógica de negócio não isolada nem testável. |
| `screens/DealsScreen.tsx`      | **515** | Tela + **editor de pipeline** (dialog CRUD de stages) + modal de perda + ações em lote + segmentos.                                                                                  |
| `screens/ContactsScreen.tsx`   | **502** | Lista + filtros + seleção em lote + kanban.                                                                                                                                          |
| `screens/DealDetailScreen.tsx` | **411** | + waterfall do item 1.2.                                                                                                                                                             |
| `screens/TasksScreen.tsx`      | **387** | Tela + modal de criação/edição inline.                                                                                                                                               |

**Correção sugerida:**

- Extrair analytics do Dashboard para `src/lib/analytics.ts` (funções puras: `computeFunnel`, `monthlyRevenue`, `atRiskDeals`) ou um hook `useDashboardMetrics`. Puro = testável.
- Mover modais grandes (`ActivityCreateEditModal`, editor de pipeline do Deals) para `src/components/crm/`.
- Extrair helpers de data (`startOfDay`, `endOfDay`, `getWeekRange`) para `src/lib/date.ts` (hoje vivem só dentro de `ActivitiesScreen`).

---

## 3. Duplicação / reutilização — **MÉDIA**

### 3.1 — Mapas de domínio reescritos em vários arquivos

| Constante                                                               | Redefinida em                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `statusColors` / `statusLabels` (contact_status → PT + classe Tailwind) | `ContactsScreen`, `ContactDrawer`, `ContactsKanbanByStatus`, `DealsList` (**4×**) |
| `typeIcons` / `typeLabels` / `typeColors` (activity_type)               | `ActivitiesScreen`, `DealDetailScreen`, `ContactDrawer` (**3×**)                  |

Qualquer mudança de rótulo/cor exige editar 3-4 arquivos e sai de sincronia.
**Correção:** centralizar em `src/lib/domain.ts` (ex.: `CONTACT_STATUS`, `ACTIVITY_TYPE` com `{ label, color, icon }`). É editável pela IA e reutilizável.

### 3.2 — Edição de pipeline/estágios **duplicada** com UX divergente

- `SettingsScreen` → `PipelinesTab`: CRUD completo de stages (add/remove/**reordena** com ▲▼).
- `DealsScreen` → `openPipelineEditor`/`savePipelineStages`/`editingStages` (linhas 65-100): **outro** editor de stages, em dialog, com diff de deleção.

Duas implementações da mesma feature, comportamentos diferentes, cores hardcoded repetidas. **Correção:** um único `<PipelineEditor>` em `components/crm/` consumido pelos dois.

### 3.3 — Formulário de contato duplicado

`ContactCreateModal` (criação) e o bloco de edição dentro de `ContactDrawer` (linhas 147-186) repetem os mesmos campos (nome/sobrenome/email/telefone/cargo/linkedin/status/empresa). **Correção:** um `<ContactForm>` compartilhado.

---

## 4. Features desconectadas / dados hardcoded — **MÉDIA**

Casos onde existe tabela + tela de configuração, mas o consumo ignora e usa valor fixo:

1. **Razões de perda hardcoded.** `SettingsScreen` gerencia a tabela `loss_reasons`, mas o modal de perda em `DealsScreen` (linhas 439-445) usa uma **lista fixa** (`Preço`, `Concorrência`, …). Deveria ler de `listLossReasons()`. Hoje a config no Settings **não tem efeito nenhum**.
2. **Meta mensal hardcoded.** `DashboardScreen` linha 111: `const monthlyGoal = 100000`. Existe a tabela `sales_goals` + `SalesGoalsScreen` inteira. O gauge "Meta do Mês" ignora os dados reais do usuário.
3. **Cores de estágio como hex soltos** (`#94a3b8`, `#3b82f6`, `#f59e0b`…) espalhadas em `DealsScreen`, `SettingsScreen`, `SetupScreen`. Centralizar num `DEFAULT_STAGE_COLORS` em `constants.ts`.

---

## 5. Bugs concretos — **verificar**

### 5.1 — Bug de fuso horário no calendário de Atividades

`ActivitiesScreen` usa `new Date(x).toISOString().split("T")[0]` para chaves de dia (linhas 209, 211, 441) e para "é hoje?" (443). `toISOString()` converte para **UTC**. Em UTC-3 (BR), uma atividade com vencimento às 22:00 local vira **o dia seguinte** no grid, e "hoje" pode destacar o dia errado perto da meia-noite.
**Correção:** formatar em horário local (ex.: `toLocaleDateString('en-CA')` ou compor `YYYY-MM-DD` de `getFullYear/getMonth/getDate`).

### 5.2 — `useMemo` com dependências incorretas

`ActivitiesScreen`, `filtered` (linha 163): deps `[activities, typeFilter, dateFilter, contacts, deals]`, mas o corpo **não usa** `contacts` nem `deals`. Dependências mortas causam recomputo desnecessário e mascaram a intenção real.

### 5.3 — Código morto mantido artificialmente

`DealsScreen` linha 177: `void openEdit;` — a função `openEdit` é definida mas **nunca ligada a nenhum botão**; o `void` existe só para enganar o `noUnusedLocals`. Ou se conecta o editar-via-Sheet (a lista/kanban navegam para `/deals/:id` em vez de abrir o Sheet), ou se remove `openEdit` + `void`.

### 5.4 — `eslint-disable` de exhaustive-deps

`DealsScreen` linha 169 silencia `react-hooks/exhaustive-deps` no efeito de `shouldOpenNew`. Funciona, mas é um sinal de dependências mal modeladas — revisar em vez de silenciar.

---

## 6. Config / manifest / menores — **BAIXA**

1. **Nome inconsistente do projeto:** `masi.template.json` diz `"id": "CellRm"` / `"name": "CellRm"`; `package.json` diz `flowcrm-masia-template`; comentários e docs dizem **FlowCRM**. Escolher **um** nome. Além disso o `id` de template por convenção é **slug minúsculo** (`forms-nps`, `crm-pro`, `wiki`) — `"CellRm"` tem maiúsculas.
2. **Vitest configurado sem testes.** `vitest` está em `devDependencies` e `tsconfig.app.json` inclui `"types": ["vitest/globals"]`, mas **não há nenhum arquivo de teste** no repo. Ou adicionar testes (ideal para os repos e a futura `lib/analytics.ts`), ou remover a config.
3. **`vercel.json` presente**, embora o deploy oficial da fundação seja **Cloudflare/R2 + edge worker** (§B10). Inofensivo para preview local, mas fora do contrato de publish — não confundir com o pipeline real.
4. **`monthlyGoal`, chaves de moeda e afins** poderiam viver em `constants.ts` (já é `editable.allow`).

---

## 7. Resumo priorizado

| #           | Item                                                        | Severidade | Esforço |
| ----------- | ----------------------------------------------------------- | ---------- | ------- |
| 1.1         | Camada de cache/hooks de dados (fim do refetch total)       | 🔴 Alta    | Médio   |
| 1.2         | Waterfall de `getX` em `DealDetailScreen` → paralelizar     | 🔴 Alta    | Baixo   |
| 4.1         | Modal de perda ignora `loss_reasons` (config sem efeito)    | 🟠 Média   | Baixo   |
| 4.2         | Dashboard ignora `sales_goals` (meta hardcoded)             | 🟠 Média   | Baixo   |
| 2           | Quebrar telas gigantes; extrair `lib/analytics.ts` + modais | 🟠 Média   | Médio   |
| 3.1         | Centralizar mapas de domínio (`lib/domain.ts`)              | 🟠 Média   | Baixo   |
| 3.2         | Unificar editor de pipeline (Settings ↔ Deals)              | 🟠 Média   | Médio   |
| 3.3         | `<ContactForm>` compartilhado                               | 🟡 Baixa   | Baixo   |
| 5.1         | Bug de timezone no calendário                               | 🟠 Média   | Baixo   |
| 5.2/5.3/5.4 | Deps de `useMemo`, `void openEdit`, eslint-disable          | 🟡 Baixa   | Baixo   |
| 6           | Nome do projeto, vitest sem testes, vercel.json             | 🟡 Baixa   | Baixo   |

**Conclusão:** a fundação (contrato gateway, schema, repos, auth) está **madura e conforme**.
As pendências concentram-se na **camada de apresentação**: falta uma camada de dados
compartilhada, há telas grandes demais, duplicação de constantes/editores, e algumas
features de configuração (razões de perda, metas) que não estão conectadas ao que a UI
realmente consome. Nenhum item exige tocar em arquivos protegidos.
