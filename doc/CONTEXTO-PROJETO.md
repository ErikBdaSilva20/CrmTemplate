# CONTEXTO DO PROJETO — CellRM (leia isto primeiro)

> **Propósito deste arquivo:** dar a um agente/dev que chega novo **todo o contexto
> do projeto em um só lugar** — o que é, como está construído, telas, fluxos,
> camada de dados, regras de arquitetura, como rodar, e o histórico das últimas
> decisões. Se você é uma nova sessão: **leia este .md e você tem o projeto inteiro
> na cabeça**, sem precisar varrer o código.
>
> Última atualização de contexto: 2026-07-03.

---

## 0. TL;DR (30 segundos)

- **CellRM** é um **template de CRM de vendas** (contatos, empresas, negócios,
  atividades, tarefas, metas, dashboard) da fundação **MasIA** ("apps prontos"
  clonáveis).
- **SPA React 19 + Vite 6 + TypeScript + Tailwind + shadcn/ui.** Sem Next, sem SSR,
  sem backend próprio.
- Fala com **um backend genérico** (o `tenant-gateway`) via CRUD `/data/:table`.
  **Toda a app já está ligada nesse backend.**
- A **única coisa mockada é o login** (`src/lib/data/mock-auth.ts`). Sem gateway
  configurado, o app **não finge dados** — mostra um aviso.
- Existe um **Postgres local** (docker-compose) já com as tabelas criadas, mas
  **o gateway HTTP ainda não roda** — então os dados ainda não fluem no app até
  alguém subir/apontar o gateway (`VITE_GATEWAY_URL`).

**Regra de ouro:** a autorização/isolamento é do backend. O front nunca manda
`owner_id`, nunca faz join no banco, nunca usa Supabase/Firebase. Detalhes na §7.

---

## 1. O que é o projeto

CRM B2B de vendas, portado de um projeto interno (Lovable + Supabase) e reconstruído
como SPA pura pra rodar na fundação MasIA. O backend original (Supabase, RLS, edge
functions) foi **descartado**; o front conversa só com o `tenant-gateway`.

Papéis de usuário: **admin / manager / rep** (+ owner = criador). O 1º usuário do
tenant vira admin; os demais entram como rep. `role` é usado **só pra UI** (esconder
botões); a segurança real é no gateway.

Fonte-da-verdade do contrato técnico da fundação: **`Importantdoc.md`** (na raiz).
Leia-o se for mexer em schema, auth, ou na camada de dados.

---

## 2. Stack & arquitetura

| Camada | Tecnologia |
| --- | --- |
| Framework | React 19 |
| Build | Vite 6 (`tsc -b && vite build`) — SPA estático, sem SSR |
| Rotas | react-router-dom 7 (`BrowserRouter`, `lazy` + `Suspense`) |
| Linguagem | TypeScript strict (`noUnusedLocals`/`noUnusedParameters` — import não usado **quebra o build**) |
| Estilo | Tailwind v3 + shadcn/ui (design "Atelier") — componentes em `src/components/ui/**` |
| Dados | Gateway genérico via `db` (`src/lib/data/client.ts`) |
| Auth | **Mockado** (`mock-auth.ts`) — trocável pelo Better-Auth do gateway |
| Banco | Postgres (schema em `supabase/migrations/`) — sem RLS, sem `auth.uid()` |
| Gráficos | recharts · Drag-and-drop: @dnd-kit · Toasts: sonner · Ícones: lucide-react |
| Testes | vitest (`npm run test`) |
| Lint | eslint flat config (`eslint.config.js`) |

Gerenciador de pacotes: **pnpm** (`packageManager` no package.json). Scripts:
`dev`, `build`, `preview`, `lint`, `test`.

---

## 3. Estrutura de pastas (o mapa)

```
src/
├── App.tsx                    # rotas (lazy) + providers
├── main.tsx                   # entry (PROTEGIDO)
├── index.css                  # tokens de tema (ver theme.md)
├── screens/                   # 1 arquivo por tela (ver §4)
├── components/
│   ├── crm/                   # componentes de domínio (modais, drawers, kanban, forms)
│   ├── layout/                # AppLayout, AppSidebar, AppHeader, MobileBottomNav, BackendNotice
│   └── ui/                    # shadcn/ui (PROTEGIDO — não editar como app)
├── hooks/
│   ├── data-cache.ts          # fábrica de cache em memória compartilhado
│   ├── use{Deals,Contacts,Companies,Activities,Pipelines,SalesGoals,Segments,LossReasons}.ts
│   └── use-mobile.tsx
└── lib/
    ├── data/
    │   ├── client.ts          # ★ COSTURA: db (real) + auth (mock) — PROTEGIDO
    │   ├── mock-auth.ts       # ★ ÚNICO MOCK: login — PROTEGIDO
    │   ├── types.gen.ts       # tipos do schema (PROTEGIDO)
    │   ├── *.repo.ts          # repositórios por entidade (editáveis)
    │   └── index.ts           # barrel dos repos
    ├── analytics.ts           # funções puras do Dashboard (+ .test.ts)
    ├── date.ts                # helpers de data (+ .test.ts)
    ├── domain.ts              # CONTACT_STATUS / DEAL_STATUS / ACTIVITY_TYPE (label/cor/ícone)
    ├── constants.ts           # INDUSTRIES, COMPANY_SIZES, DEFAULT_STAGE_COLORS, ...
    ├── format.ts              # formatação de moeda/data
    ├── auth.tsx               # AuthProvider + RequireAuth + roleAtLeast (PROTEGIDO)
    └── utils.ts               # cn() do shadcn (PROTEGIDO)

supabase/migrations/0001_business_schema.sql   # schema real (PROTEGIDO)
docker-compose.yml             # Postgres local (só o banco, sem gateway)
masi.template.json             # manifest do template (id, telas, editable allow/protect)
```

---

## 4. Telas e fluxos

Rotas em `src/App.tsx`. Todas (menos login/setup) ficam dentro do `AppLayout`
(sidebar + header + `BackendNotice`), protegidas por `RequireAuth`.

| Rota | Tela | O que faz |
| --- | --- | --- |
| `/login` | `LoginScreen` | Entrar/cadastrar (auth **mockado**). 1º user = admin → vai pro `/setup`. |
| `/setup` | `SetupScreen` | Onboarding: cria empresa-semente + pipeline com 5 estágios padrão. |
| `/dashboard` | `DashboardScreen` | KPIs (receita, win rate, ticket, ciclo), funil, receita 12m, atividades por tipo/dia, negócios at-risk, meta do mês. Auto-refetch 5min. Analytics puro em `lib/analytics.ts`. |
| `/contacts` | `ContactsScreen` | Lista/cartões/funil-por-status (kanban drag). Filtros, segmentos, seleção em lote, import/export CSV, drawer de detalhe. |
| `/companies` | `CompaniesScreen` | Lista/cartões. Filtros, lote, CSV, drawer. Logo por domínio via clearbit (externo, best-effort). |
| `/deals` | `DealsScreen` | Kanban (drag entre estágios + drop won/lost) / Lista / Previsão. Editor de pipeline, modal de perda (lê `loss_reasons`), segmentos, lote. |
| `/deals/:id` | `DealDetailScreen` | Detalhe do negócio: edição inline, estágio, ganho/perda, qualificação BANT, timeline de atividades. |
| `/activities` | `ActivitiesScreen` | Lista + calendário (dia). Filtros por tipo/data. Modal criar/editar (`ActivityCreateEditModal`). |
| `/tasks` | `TasksScreen` | Tarefas = `activities` com `type='task'`. Lista com filtros de data, criar/editar/concluir. |
| `/sales-goals` | `SalesGoalsScreen` | Metas mensais (receita/deals/atividades/contatos). Realizado calculado no front sobre deals/activities/contacts. |
| `/segments` | `SegmentsScreen` | CRUD de "filtros salvos" (tabela `segments`, `filters` jsonb) reutilizados em Contatos/Negócios. |
| `/settings` | `SettingsScreen` | Lookups (admin/manager): pipelines, estágios (via `PipelineEditor`), razões de perda, tags. |
| `*` | `NotFoundScreen` | 404. |

**Componentes de domínio reutilizados** (`components/crm/`): `PipelineEditor` (usado
por Settings e Deals), `ContactForm` (usado por criar + editar contato),
`ActivityCreateEditModal`, `DealsKanban`/`DealsList`/`DealsForecast`/`DealsFilters`,
`ContactsKanbanByStatus`, `DealQualification` (BANT), `CompanyDrawer`/`ContactDrawer`,
`*CreateModal`, `CSVImportModal`.

---

## 5. Camada de dados (o coração)

> **Documento dedicado e mais detalhado: `doc/FLUXO-DE-DADOS.md`.** (tabelas,
> relações, mapa tela→tabela, onde cada dado reflete). Leia-o se for mexer em dados.

Resumo do caminho:

```
Tela → hook de cache (useX) → repo (*.repo.ts) → db.table() [client.ts] → gateway /data/:table → Postgres
```

- **`client.ts` é a costura única.** Expõe `db` (backend REAL) e `auth` (MOCK).
  - `db` só funciona com `VITE_GATEWAY_URL`. Sem isso, lança
    `BackendNotConfiguredError` (não simula dados). `isBackendConfigured` diz se há
    gateway; `BackendNotice` (barra no layout) avisa quando não há.
- **Cache compartilhado** (`hooks/data-cache.ts`): cada entidade tem um store em
  memória. A 1ª tela que monta busca; as demais reutilizam. Uma mutação chama
  `refresh()`/`invalidate()` → **todos os componentes inscritos re-renderizam**. É
  por isso que "adicionar em uma tela reflete em todas" sem reload.
- **Modo genérico = sem get-by-id e sem join no servidor.** Telas fazem
  **list-then-filter no front**; relações resolvidas cruzando listas já cacheadas
  (ex.: `enrichDeals(deals, contacts, companies)`).

**Tabelas** (12 de negócio, schema em `0001_business_schema.sql`):
- Lookups (sem `owner_id`): `pipelines`, `pipeline_stages`, `tags`, `loss_reasons`.
- Dados do rep (com `owner_id`): `companies`, `contacts`, `deals`, `activities`,
  `contact_tags`, `deal_tags`, `sales_goals`, `segments`.

---

## 6. Auth mockado

- `src/lib/data/mock-auth.ts` — **o único mock do app.** Usuários + sessão em
  **localStorage** (login sobrevive ao F5). 1º usuário = admin, demais = rep.
- Admin de demonstração semeado: **`admin@demo.local` / `demo1234`**.
- Pra integrar auth real: em `client.ts`, troque os 4 métodos de `auth`
  (`signIn/signUp/signOut/me`) por chamadas `api(...)` a `/auth/*` do gateway; depois
  delete `mock-auth.ts`. Nada mais no app muda (é agnóstico de auth).

---

## 7. Regras de arquitetura (contrato — NÃO viole)

Do `Importantdoc.md` (§B4/§B5/§B8). Quebrar isto quebra o clone na fundação:

- ✅ Acesso a dados **só** via `db`/`auth` do `client.ts`. **Zero** Supabase/Firebase,
  fetch cru pro banco, ou driver SQL no browser.
- ✅ `owner_id text not null references "user"(id) on delete cascade` em **toda**
  tabela escrita pelo rep — **inclusive filhas** (`contact_tags`, `deal_tags`).
  **`owner_id` NUNCA é enviado do front** (o gateway seta pela sessão).
- ✅ Sem RLS, sem `auth.uid()`, sem `profiles`, sem `org_id`. Autz é no gateway.
- ✅ `snake_case` minúsculo; sem nomes de tabela reservados (`user`, `session`,
  `account`, `verification`, `organization`, `member`, `invitation`).
- ✅ Telas fazem **list-then-filter** (sem depender de `GET /data/:table/:id` ou join).
- **Arquivos PROTEGIDOS** (contrato com o gateway — ver `masi.template.json`
  `editable.protect`): `client.ts`, `mock-auth.ts`, `types.gen.ts`, `auth.tsx`,
  `components/ui/**`, `utils.ts`, `main.tsx`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `components.json`, `supabase/migrations/**`.

---

## 8. Como rodar localmente

### 8.1 Banco (Postgres via docker)

```bash
docker compose up -d          # sobe o Postgres (porta 5432 no host, ver docker-compose.yml)
# aplica o schema (idempotente):
docker compose exec -T db psql -U masia -d tenant_local < supabase/migrations/0001_business_schema.sql
```

Conexão (Beekeeper/psql): host `localhost`, porta `5432` (confira em `docker-compose.yml`
— já mudou uma vez nesta sessão, é a porta mapeada em `ports:` que vale, não a
interna do container), db `tenant_local`, user `masia`, senha `masia_dev`, SSL off.

> ⚠️ O `0001_business_schema.sql` tem um **stub local da tabela `"user"`** no topo:
> em produção o gateway cria essa tabela antes da migration; localmente não há
> gateway, então o stub evita que as FKs `owner_id references "user"(id)` falhem.
> **Não rode esse stub contra Neon/produção.**

### 8.2 App

```bash
pnpm install
pnpm dev            # http://localhost:5174 (ou próxima porta livre)
```

Login com `admin@demo.local` / `demo1234`. **As telas de dados ficam vazias com o
aviso "backend não conectado"** até você definir `VITE_GATEWAY_URL` (o
docker-compose sobe só o banco; falta o gateway HTTP servir `/data/:table`).

### 8.3 Verificação

```bash
pnpm test           # vitest (21 testes: analytics, date, enrichDeals)
npx tsc -b --noEmit # typecheck
pnpm lint           # eslint
pnpm build          # build de produção
```

---

## 9. Documentos de referência (mapa dos .md)

| Arquivo | O quê |
| --- | --- |
| **`doc/CONTEXTO-PROJETO.md`** | Este arquivo — contexto geral (comece aqui). |
| `doc/FLUXO-DE-DADOS.md` | Detalhe de tabelas, relações, mapa tela→tabela, onde dados refletem. |
| `Importantdoc.md` | Contrato técnico da fundação MasIA (schema, auth, gateway). Autoridade máxima. |
| `doc/AUDITORIA-CODIGO.md` | Auditoria de código original (11 itens) que guiou o refactor recente. |
| `doc/RELATORIO-EXECUCAO.md` | O que foi feito por bloco na resolução da auditoria + achados da revisão. |
| `doc/IDEIAS-CRM.md` | Ideias/backlog de features (snapshot, timeline, busca global, etc.). |
| `theme.md` | Tokens de tema / design system. |
| `THIRD_PARTY.md` | Origem do markup e libs de terceiros (licenças). |

---

## 10. Histórico recente (o que aconteceu nas últimas sessões)

Contexto pra entender o estado atual do código (útil pra um agente que continua).

### Sessão A — Resolução da auditoria de código (commit `9cb5054`)
Resolveu todos os 11 itens de `doc/AUDITORIA-CODIGO.md`:
1. **Cache de dados compartilhado** (`hooks/data-cache.ts` + hooks por entidade) —
   fim do re-fetch total ao navegar entre telas; `DealDetailScreen` deixou de fazer
   waterfall sequencial.
2. **Domínio centralizado** (`lib/domain.ts`) — fim dos mapas status/label/ícone
   duplicados em 7 arquivos. Cores de estágio → `constants.ts`.
3. **Features reconectadas**: modal de perda lê `loss_reasons`; meta do Dashboard lê
   `sales_goals` (antes eram hardcoded).
4. **Analytics/date puros extraídos** (`lib/analytics.ts`, `lib/date.ts` + testes);
   `ActivityCreateEditModal` extraído.
5. **Editores unificados**: `PipelineEditor` e `ContactForm` compartilhados.
6. **Bugs**: timezone do calendário (UTC→local), deps de useMemo, código morto,
   eslint-disable.
7. **Config**: nome padronizado (CellRM / slug minúsculo), `eslint.config.js` criado
   (lint estava quebrado), `vitest.config.ts` + 21 testes.
- Revisão adversarial (bmad-code-review) rodou depois e seus achados acionáveis foram
  corrigidos (corrida no mount do DealDetail, PipelineEditor perdendo edições,
  otimismo no drag de contatos, drawers com snapshot congelado). Detalhe em
  `doc/RELATORIO-EXECUCAO.md`.

### Sessão B — Integração / mock só no login (mudanças ainda NÃO commitadas)
Decisão do usuário: **não há gateway; só o login é mockado, o resto fala com backend
real e avisa quando não há.**
- **Reformou `client.ts`**: `db` sempre chama o gateway real (lança
  `BackendNotConfiguredError` sem URL); `auth` delega ao mock; exporta
  `isBackendConfigured`.
- **Criou `mock-auth.ts`** (login mockado, localStorage, admin demo) e **removeu
  `preview-fixtures.ts`** (mock de dados eliminado — dados não são mais simulados).
- **`BackendNotice`** no layout avisa quando não há gateway.
- Atualizou `.env.example`, `vite-env.d.ts`, `tsconfig.app.json`, `masi.template.json`.
- Escreveu `doc/FLUXO-DE-DADOS.md`.
- **Docker/migration**: adicionou o comando de aplicação + stub da tabela `"user"` no
  topo do `0001_business_schema.sql`; aplicou e confirmou as 13 tabelas no Postgres
  local. `docker-compose.yml` passou por dois renames nesta sessão
  (`flowcrm→CellRM→` config atual: container `masia_local_db2`, porta `5432`, volume
  `masia_pgdata`) enquanto o usuário depurava a conexão do Beekeeper Studio — cada
  rename trocou o nome do volume Docker, deixando órfãos (`crmtemplate_masia_pgdata_flowcrm`,
  `crmtemplate_masia_pgdata_CellRM`) que foram removidos ao final da sessão.

---

## 11. Estado atual & pendências

**Estado:** app compila, testa e builda limpo. Login mockado funciona. Postgres local
com tabelas criadas. Mudanças da Sessão B **ainda não commitadas** (ver `git status`).

**Pendências conhecidas** (nenhuma bloqueante — detalhe em `doc/RELATORIO-EXECUCAO.md`):
- Não há **gateway HTTP** rodando; sem `VITE_GATEWAY_URL` os dados não fluem (só o
  banco está de pé). Próximo passo real de integração é subir/apontar o gateway.
- **Smoke test manual no navegador** ainda não feito (sem ferramenta de automação nas
  sessões anteriores).
- Duas convenções de "início de semana" (domingo em `analytics.ts`, segunda em
  `date.ts`) — decisão de produto pendente, não é bug.
- Erros de fetch não têm banner por-tela (só o `BackendNotice` global) — melhoria.
- `contact_tags`/`deal_tags` têm repo pronto mas **sem UI de atribuição de tag** ainda.

**Se você é um novo agente continuando:** confirme `git status`, rode a verificação
da §8.3, e leia `doc/FLUXO-DE-DADOS.md` antes de mexer na camada de dados.
