# Fluxo de Dados & Integração — CellRM

> Como o front conversa com o backend, como as tabelas se relacionam, e **onde um
> dado adicionado numa tela reflete nas outras**.
>
> **Resumo em uma frase:** todo o dado de negócio passa por **um único backend
> genérico** (o `tenant-gateway`, via `/data/:table`); a **única coisa mockada é o
> login**. Sem gateway configurado, o app **não finge dados** — ele avisa.

---

## 1. Arquitetura de integração

### 1.1 O caminho de um dado (leitura e escrita)

```
Tela (.tsx)
  │  usa
  ▼
Hook de cache            src/hooks/useDeals.ts, useContacts.ts, ...  (estado compartilhado)
  │  chama
  ▼
Repositório              src/lib/data/*.repo.ts   (listDeals, createDeal, ...)
  │  chama
  ▼
db.table('deals')        src/lib/data/client.ts   ← A COSTURA DE INTEGRAÇÃO
  │  fetch
  ▼
tenant-gateway           GET/POST/PATCH/DELETE  ${VITE_GATEWAY_URL}/data/:table
  │  SQL
  ▼
Postgres (Neon) do tenant
```

Nenhuma tela fala com o banco direto, nem tem endpoint próprio. Tudo é o **modo
genérico**: `list / create / update / remove` sobre `/data/:table`.

### 1.2 A costura: `src/lib/data/client.ts`

Este arquivo é o **contrato** e o único ponto que conhece o backend. Ele expõe duas superfícies:

| Superfície | Estado      | O quê                                                                      |
| ---------- | ----------- | -------------------------------------------------------------------------- |
| `db`       | **REAL**    | CRUD genérico no gateway. Todas as tabelas de negócio passam por aqui.     |
| `auth`     | **MOCKADO** | Login/sessão simulados (`src/lib/data/mock-auth.ts`) — a única parte fake. |

- `db` só funciona com `VITE_GATEWAY_URL` definido. Sem isso, cada chamada lança
  `BackendNotConfiguredError` (não simula dados).
- `isBackendConfigured` (exportado de `client.ts`) indica se há gateway. O
  componente `BackendNotice` (barra no topo, `src/components/layout/`) usa isso pra
  avisar quando o backend não está conectado.

### 1.3 Como conectar o backend real (para o dev que for integrar)

1. **Dados:** defina `VITE_GATEWAY_URL` (`.env.local`) apontando pro seu gateway.
   `db` passa a bater nele **sem nenhuma mudança de código**; o aviso some sozinho.
2. **Auth:** abra `client.ts` e troque os 4 métodos de `auth` (`signIn`, `signUp`,
   `signOut`, `me`) por chamadas `api(...)` aos endpoints `/auth/*` do gateway —
   mesmo padrão que `db` já usa. Depois **delete `mock-auth.ts`**. O resto do app
   (telas, repos, hooks) é agnóstico de auth e não muda.

### 1.4 O login mockado (`src/lib/data/mock-auth.ts`)

- Guarda usuários + sessão no **localStorage** (fallback em memória em testes/SSR),
  então o login **sobrevive ao refresh (F5)**.
- Regras que espelham o gateway real: **1º usuário vira `admin`**, os demais entram
  como `rep`.
- Semeia um admin de demonstração no primeiro uso: **`admin@demo.local` / `demo1234`**.
- Está fortemente comentado, marcado como o único mock e apontando onde trocar.

> ⚠️ É mock: senha em texto puro, sem criptografia, sem verdadeira multi-tenancy.
> Serve só pra entrar no app e demonstrar a UI antes do backend de auth existir.

---

## 2. Modelo de dados

Duas famílias de tabelas (regras em `Importantdoc.md` §B4 e no cabeçalho da migration
`supabase/migrations/0001_business_schema.sql`).

### 2.1 Lookups (configuração — **sem `owner_id`**, leitura liberada, escrita admin/manager)

| Tabela            | Papel                   | Colunas-chave                                                               |
| ----------------- | ----------------------- | --------------------------------------------------------------------------- |
| `pipelines`       | Funis de venda          | `name`, `currency`, `is_default`                                            |
| `pipeline_stages` | Estágios de um pipeline | `pipeline_id → pipelines`, `name`, `sort_order`, `color`, `win_probability` |
| `tags`            | Etiquetas reutilizáveis | `name` (unique), `color`                                                    |
| `loss_reasons`    | Motivos de perda        | `label`, `is_active`, `usage_count`                                         |

### 2.2 Dados do rep (**`owner_id text references "user"(id)`** — o gateway seta pela sessão; nunca enviado do front)

| Tabela         | Papel                                    | Relações (FK)                                                                                    |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `companies`    | Empresas                                 | —                                                                                                |
| `contacts`     | Contatos                                 | `company_id → companies` (on delete set null)                                                    |
| `deals`        | Negócios (BANT em `qualification` jsonb) | `stage_id → pipeline_stages`, `contact_id → contacts`, `company_id → companies` (todas set null) |
| `activities`   | Atividades **e** tarefas (`type='task'`) | `contact_id → contacts`, `deal_id → deals`, `company_id → companies` (set null)                  |
| `contact_tags` | Vínculo contato↔tag (filha)              | `contact_id → contacts`, `tag_id → tags` (cascade)                                               |
| `deal_tags`    | Vínculo negócio↔tag (filha)              | `deal_id → deals`, `tag_id → tags` (cascade)                                                     |
| `sales_goals`  | Metas mensais                            | `goal_type`, `target_value`, `period_month`, `period_year`                                       |
| `segments`     | Filtros salvos (`filters` jsonb)         | —                                                                                                |

**Enums:** `contact_status` (lead/prospect/customer/churned), `deal_status`
(open/won/lost), `activity_type` (call/email/meeting/note/task).

### 2.3 Limites do modo genérico (importante pro entendimento)

- **Sem get-by-id e sem join no servidor.** As telas fazem **list-then-filter no
  front**: baixam a tabela inteira e cruzam/filtram em memória.
- Ex.: `enrichDeals(deals, contacts, companies)` (`deals.repo.ts`) anexa
  `contact`/`company` a cada deal no cliente — é o "join" que o servidor não faz.
- Consequência: relações são resolvidas juntando **duas listas já cacheadas**, não
  buscando por id.

---

## 3. Mapa tela → tabelas

Quem **lê** (via hooks de cache) e quem **escreve** (via repos) cada tabela.

| Tabela                       | Lê (telas/componentes)                                                                    | Escreve                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `companies`                  | Empresas, Negócios (form), Contatos (form/drawer), Atividades, Dashboard, Setup, drawers  | CompanyCreateModal, CompanyDrawer, CompaniesScreen (excluir), CSVImportModal, SetupScreen                        |
| `contacts`                   | Contatos (3 visões), Negócios, Atividades, Tarefas, Dashboard, Metas, drawers             | ContactCreateModal, ContactDrawer, ContactsScreen (status/excluir), CompanyCreateModal (vínculo), CSVImportModal |
| `deals`                      | Negócios (kanban/lista/previsão), Detalhe, Dashboard, Metas, Atividades, Tarefas, drawers | DealsScreen (criar/editar/mover/won/lost/excluir), DealDetailScreen, DealQualification                           |
| `activities`                 | Atividades (lista/calendário), Tarefas, Dashboard, Contatos (inatividade), drawers        | ActivitiesScreen, TasksScreen, ActivityCreateEditModal, ContactDrawer, DealDetailScreen                          |
| `pipelines`                  | Negócios, Configurações, Setup, drawers                                                   | SettingsScreen, SetupScreen                                                                                      |
| `pipeline_stages`            | Negócios (colunas), Detalhe (progresso), Dashboard (funil), Config, drawers               | PipelineEditor (Config + Negócios), SetupScreen                                                                  |
| `loss_reasons`               | Negócios (modal de perda), Detalhe (modal de perda)                                       | SettingsScreen                                                                                                   |
| `tags`                       | Configurações                                                                             | SettingsScreen                                                                                                   |
| `sales_goals`                | Metas, Dashboard ("Meta do Mês")                                                          | SalesGoalsScreen                                                                                                 |
| `segments`                   | Contatos, Negócios (aplicar filtro), Filtros Salvos                                       | SegmentsScreen                                                                                                   |
| `contact_tags` / `deal_tags` | (repos prontos; **sem UI de atribuição de tag ainda**)                                    | —                                                                                                                |

---

## 4. Onde um dado adicionado reflete (cross-screen)

**Mecanismo:** os hooks de `src/hooks/` são um **cache em memória compartilhado**
(`data-cache.ts`). Quando uma mutação roda, o código chama o repo (→ gateway) e em
seguida `refresh()`/`invalidate()` daquele hook — **todos os componentes inscritos
naquele hook re-renderizam com o dado novo**. Por isso adicionar em uma tela reflete
nas outras sem recarregar a página.

| Ação                                                      | Tabela            | Reflete em                                                                                                                                                                        |
| --------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Criar **empresa** (qualquer origem: Empresas, CSV, Setup) | `companies`       | Lista de Empresas; seletor de empresa ao criar Negócio; empresa no form/drawer de Contato; coluna "Organização" em Atividades; métricas do CompanyDrawer                          |
| Criar **contato**                                         | `contacts`        | Contatos (tabela/cartões/funil); seletores de contato em Negócios, Atividades e Tarefas; KPI "Contatos" e "Novos contatos por status" no Dashboard; aba Contatos do CompanyDrawer |
| Criar/editar/mover **negócio**                            | `deals`           | Negócios (kanban/lista/previsão); Dashboard (receita, win rate, ticket, funil, at-risk); Metas (realizado); aba Negócios dos drawers de Contato/Empresa                           |
| Marcar negócio **ganho/perdido**                          | `deals`           | Dashboard (receita/win rate sobem); Metas (realizado do período); Kanban (colapsáveis Ganhos/Perdidos)                                                                            |
| Criar **atividade** ou **tarefa**                         | `activities`      | Atividades (lista/calendário); Tarefas (se `type='task'`); Dashboard (atividades por tipo/dia); selo de inatividade em Contatos; timeline nos drawers e no Detalhe do Negócio     |
| Editar **estágios do pipeline** (Config ou Negócios)      | `pipeline_stages` | Colunas do Kanban de Negócios; barra de progresso do Detalhe; funil do Dashboard                                                                                                  |
| Cadastrar **motivo de perda** (Config)                    | `loss_reasons`    | Opções do modal "Motivo da Perda" em Negócios e no Detalhe                                                                                                                        |
| Definir **meta** de receita do mês (Metas)                | `sales_goals`     | Gauge "Meta do Mês" no Dashboard; cards/tabela de Metas                                                                                                                           |
| Salvar **filtro** (Filtros Salvos)                        | `segments`        | Dropdown "Segmentos" em Contatos e em Negócios                                                                                                                                    |

**Exemplo ponta a ponta:** adicionar uma empresa "Acme" → `POST /data/companies` →
`invalidateCompanies()` → o hook `useCompanies()` re-emite → a lista de Empresas, o
`<Select>` de empresa no cadastro de Negócio e o form de Contato passam a mostrar
"Acme" imediatamente, sem reload.

---

## 5. O que **não** existe (pra não confundir)

- **Sem realtime/push.** A propagação é dentro da mesma aba (cache compartilhado) e
  em cada refetch. Mudança feita por **outro usuário** só aparece no próximo
  `refresh()` (o Dashboard tem auto-refetch de 5 min; as demais telas revalidam ao
  mutar). Não há WebSocket.
- **Sem join no servidor / sem get-by-id.** Relações são cruzadas no front.
- **Sem `owner_id` vindo do front.** O gateway o define pela sessão; o isolamento por
  usuário/tenant é responsabilidade do backend, não da UI.

---

## 6. Arquivos de referência

| Arquivo                                         | Papel                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/data/client.ts`                        | Costura de integração (`db` real, `auth` mock, `isBackendConfigured`) |
| `src/lib/data/mock-auth.ts`                     | Login mockado (localStorage) — **único mock**                         |
| `src/lib/data/*.repo.ts`                        | Repositórios por entidade (chamam `db.table(...)`)                    |
| `src/hooks/data-cache.ts` + `src/hooks/use*.ts` | Cache compartilhado e invalidação                                     |
| `src/components/layout/BackendNotice.tsx`       | Aviso "backend não conectado"                                         |
| `supabase/migrations/0001_business_schema.sql`  | Schema real das tabelas                                               |
| `.env.example`                                  | Como configurar `VITE_GATEWAY_URL`                                    |
