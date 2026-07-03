# Relatório de Execução — Auditoria CellRM

> **Referência:** `AUDITORIA-CODIGO.md` (auditoria original) + `Importantdoc.md` (contrato de arquitetura).
> **Data:** 2026-07-03.
> **Status:** Blocos A–G concluídos e verificados (tsc/vitest/eslint/build limpos). Revisão adversarial (bmad-code-review) executada sobre o diff completo; todos os achados acionáveis foram corrigidos (seção 3). O que resta na seção 4 são decisões conscientes de não mexer (mudança de comportamento de negócio ou itens fora de escopo), não bugs pendentes. Único ponto em aberto: smoke test manual em navegador (sem ferramenta de automação disponível nesta sessão).

---

## 1. O que foi feito, por bloco

### Bloco A — Camada de dados compartilhada (§1.1) + fim do waterfall (§1.2)

- **Novo:** `src/hooks/data-cache.ts` — factory de cache em memória (`createCollectionHook`), um store por entidade, `useSyncExternalStore` para inscrição reativa, `invalidate()`/`refresh()` para forçar refetch compartilhado entre telas.
- **Novo:** um hook por entidade — `useDeals`, `useContacts`, `useCompanies`, `useActivities`, `usePipelines`/`useStages`, `useSalesGoals`, `useSegments`, `useLossReasons` (todos em `src/hooks/`).
- Todas as telas que antes tinham `useEffect` + `Promise.all([listX(), listY()...])` próprios (Dashboard, Deals, Activities, Contacts, Companies, Tasks, SalesGoals, Segments, Settings) foram migradas pra consumir os hooks compartilhados. Navegar entre telas não re-baixa mais as mesmas tabelas.
- **DealDetailScreen**: a busca sequencial `getDeal → getContact → getCompany` foi eliminada — `contact`/`company`/`stages` agora resolvem de listas já cacheadas (sem requisição extra nenhuma); só `listActivitiesByDeal(id)` continua sendo uma busca dedicada (correta, pois é filtrada por id, não full-table).
- Mutações chamam `invalidateX()`/`refresh()` do hook correspondente ao invés de re-fetch local isolado.

### Bloco B — Domínio centralizado (§3.1) + cores de estágio (§4.3)

- **Novo:** `src/lib/domain.ts` — `CONTACT_STATUS`, `DEAL_STATUS`, `ACTIVITY_TYPE` (`{label, badgeClassName, icon}`), substituindo os mapas `statusColors`/`statusLabels`/`typeIcons`/`typeLabels`/`typeColors` que estavam duplicados em `ContactsScreen`, `ContactDrawer`, `ContactsKanbanByStatus`, `DealsList`, `ActivitiesScreen`, `DealDetailScreen`, `CompanyDrawer`.
- **`constants.ts`**: adicionado `DEFAULT_STAGE_COLORS` (5 cores hex) e `DEFAULT_MONTHLY_REVENUE_GOAL`, consumidos por `SetupScreen`, `PipelineEditor`, `DashboardScreen` — fim dos hex soltos divergentes.

### Bloco C — Features desconectadas (§4.1, §4.2)

- Modal de "Motivo da Perda" (`DealsScreen` e `DealDetailScreen`) agora lê `useLossReasons()` (→ `listLossReasons()`), não mais lista fixa hardcoded. Configurar razões em Settings agora tem efeito real.
- `DashboardScreen`: `monthlyGoal` busca a meta de receita do mês corrente em `sales_goals` (`useSalesGoals()`); só cai no fallback `DEFAULT_MONTHLY_REVENUE_GOAL` quando não há meta cadastrada.

### Bloco D — Telas grandes quebradas (§2)

- **Novo:** `src/lib/analytics.ts` — funções puras extraídas do Dashboard (`computeFunnel`, `computeMonthlyRevenue`, `computeAtRiskDeals`, `computePreviousPeriodRevenue`, `computeAverageSalesCycleDays`, `computeActivitiesByType/ByDayOfWeek`, `computeNewLeadsByStatus`, `getPeriodStart`, `isInPeriod`, `computePercentage`). Testadas em `analytics.test.ts`.
- **Novo:** `src/lib/date.ts` — `startOfDay`, `endOfDay`, `getWeekRange`, `toLocalDateKey` (extraídos de `ActivitiesScreen`, que estavam duplicados em `TasksScreen`). Testados em `date.test.ts`.
- **Novo:** `src/components/crm/ActivityCreateEditModal.tsx` — extraído de dentro de `ActivitiesScreen.tsx` (~190 linhas).
- Resultado: `DashboardScreen` 610→503 linhas (lógica de negócio saiu, só ficou layout), `ActivitiesScreen` 675→440.

### Bloco E — Duplicação de editores/formulários (§3.2, §3.3)

- **Novo:** `src/components/crm/PipelineEditor.tsx` — editor único de estágios, consumido por `DealsScreen` ("Personalizar pipeline") e `SettingsScreen` (aba Pipelines), substituindo as duas implementações divergentes.
- **Novo:** `src/components/crm/ContactForm.tsx` — formulário único de contato, consumido por `ContactCreateModal` e pelo modo de edição de `ContactDrawer`.

### Bloco F — Bugs concretos (§5.1–§5.4)

- **§5.1 (timezone):** `toLocalDateKey()` em `lib/date.ts` monta a chave `YYYY-MM-DD` a partir de `getFullYear/getMonth/getDate` locais, não `toISOString()`. Usado no calendário de `ActivitiesScreen`.
- **§5.2 (deps erradas):** `filtered` em `ActivitiesScreen` agora depende só de `[sortedActivities, typeFilter, dateFilter]` (removidos `contacts`/`deals`, nunca lidos no corpo). Mesmo bug corrigido proativamente em `TasksScreen` (era cópia do mesmo padrão).
- **§5.3 (código morto):** `openEdit`/`void openEdit` removidos de `DealsScreen`.
- **§5.4 (eslint-disable):** o disable no efeito de `shouldOpenNew` foi removido; `pipelineStages` virou `useMemo`, e as deps do efeito ficaram corretas (`[shouldOpenNew, pipelineStages, searchParams, setSearchParams]`).

### Bloco G — Config/manifest (§6)

- `masi.template.json`: `"id"` corrigido para slug minúsculo `"cellrm"` (era `"CellRm"`, maiúsculas violavam a convenção); `"name"` padronizado para `"CellRM"`.
- `package.json`: `"name"` corrigido para `"cellrm-masia-template"` (nomes de pacote npm não podem ter maiúsculas).
- **Vitest:** estava em `devDependencies` com `types: ["vitest/globals"]` no `tsconfig.app.json` mas **zero arquivos de teste** e nenhum script `test`. Adicionado `vitest.config.ts` (arquivo próprio, não mexe no `vite.config.ts` protegido), script `"test": "vitest run"`, e 3 arquivos de teste reais (21 testes) cobrindo `enrichDeals`, `lib/date.ts` e `lib/analytics.ts`.
- **ESLint:** `package.json` já declarava `"lint": "eslint ."` mas **não existia `eslint.config.js` nenhum** — `npm run lint` falhava sempre. Criado `eslint.config.js` (flat config, TS + react-hooks + react-refresh, ignorando `src/components/ui/**` e `tailwind.config.ts` por serem vendor/protegidos).
- `vercel.json`: mantido como está — auditoria já classificava como informativo/baixo risco (deploy oficial é Cloudflare/R2), não é um bug a corrigir.

---

## 2. Verificação executada

Rodada duas vezes: ao final dos blocos A–G, e de novo depois de aplicar os fixes da revisão adversarial (seção 3).

| Comando | Resultado |
|---|---|
| `npx tsc -b --noEmit` | ✅ limpo, zero erros (ambas as rodadas) |
| `npx vitest run` | ✅ 3 arquivos, 21/21 testes passando (ambas as rodadas) |
| `npx eslint .` | ✅ 0 erros, 3 warnings pré-existentes (`react-refresh/only-export-components`, mesmo padrão já usado em `auth.tsx`) |
| `npx vite build` | ✅ build de produção completo, chunks por hook/lib gerados corretamente (ambas as rodadas) |
| Browser manual (dev server) | ⚠️ **não realizado** — não há ferramenta de automação de navegador disponível nesta sessão. O servidor dev (`vite`) foi iniciado e respondeu HTTP 200 servindo o shell da SPA, mas não houve verificação de clique-a-clique nas telas. **Recomenda-se rodar `npm run dev` e navegar pelas telas principais (Dashboard, Contatos nas 3 visões incl. drag no funil, Negócios nas 3 visões + editor de pipeline + modal de perda, Detalhe do Negócio, Atividades lista/calendário, Configurações) antes de considerar o trabalho 100% validado em runtime.**

---

## 3. Revisão adversarial (bmad-code-review)

Rodada com 3 sub-agentes em paralelo sobre o diff completo (`git diff HEAD`, ~5900 linhas):

- **Blind Hunter** (`bmad-review-adversarial-general`, sem contexto de projeto, só o diff)
- **Edge Case Hunter** (`bmad-review-edge-case-hunter`, diff + acesso de leitura ao repo)
- **Acceptance Auditor** (custom, diff vs. `AUDITORIA-CODIGO.md` item a item)

**Resultado do Acceptance Auditor** (auditoria original × diff, item por item): todos os 11 itens marcados como **fully fixed**, exceto:
- §2 (telas grandes) → **partially fixed** (Dashboard/Activities encolheram bem; DealsScreen/DealDetailScreen/TasksScreen quase não mudaram de tamanho — não eram o problema real, que era lógica de negócio misturada, já resolvida; `ContactsScreen` na verdade **cresceu** 502→697, mas isso é herança do reformatting de uma sessão anterior à minha — antes de eu tocar já estava em 731 linhas, eu reduzi 34 linhas, não fiz crescer).
- §6.3 (`vercel.json`) → não tocado, mas a própria auditoria já tratava como informativo, não como pendência real.

**Achados do Blind Hunter + Edge Case Hunter** — triados e corrigidos (nesta sessão e na continuação):
1. ✅ **[Alto] `PipelineEditor` perdia edições em progresso a cada re-render do pai** — o array de `stages` passado como prop é recriado a cada render (`stages.filter(...)`), e o efeito de seed do draft rodava de novo. Corrigido: seed só na transição `open: false→true` (guarda via `useRef`).
2. ✅ **[Alto/Médio, confirmado por 2 revisores] Corrida no mount do `DealDetailScreen`** — o store de cache iniciava com `loading: false`, então um acesso direto a `/deals/:id` podia disparar o redirect pra `/deals` antes do primeiro fetch sequer começar. Corrigido: estado inicial do store passou a ser `loading: true`.
3. ✅ **[Baixo] Corrida em `invalidate()`/`refresh()` concorrentes** — uma resposta antiga podia sobrescrever uma mais nova. Corrigido: guarda de `requestId` monotônico em `data-cache.ts`, só a última requisição commita no estado.
4. ✅ **[Baixo] `win_probability` sem clamp** no `PipelineEditor` — `min`/`max` do `<input>` são só dicas de UI, um valor fora de 0–100 passava direto pro backend. Corrigido: clamp em `updateField`.
5. ✅ **[Baixo] Botão "Personalizar pipeline" em `DealsScreen` não respeitava `selectedPipeline` vazio** (diferente de `SettingsScreen`, que já fazia essa guarda) — podia abrir o editor com `pipelineId=""`. Corrigido: `disabled={!selectedPipeline}`.
6. ✅ **[Baixo] `PipelineEditor.handleSave` serializava N chamadas de create/update** — agora paralelizado em `Promise.all` junto com as deleções (chamadas independentes, seguro paralelizar).
7. ✅ **[Médio] Drag do Kanban de Contatos tinha perdido a atualização otimista** — `ContactsScreen` agora espelha `useContacts()` num state local (`contacts`/`setContacts`, mesmo padrão de `DealsScreen`); `handleStatusChange` aplica `setContacts` otimista antes do `await updateContact(...)` + `refreshContacts()`. O card volta a pular de coluna instantaneamente no drag.
8. ✅ **[Médio] `ContactDrawer`/`CompanyDrawer` mostravam dado desatualizado logo após salvar** — bug pré-existente (mesmo padrão já estava no código original). `drawerContactId`/`drawerCompanyId` agora guardam só o id; `drawerContact`/`drawerCompany` são derivados via `useMemo` a partir da lista atual (`contacts.find(...)`/`companies.find(...)`), sempre refletindo a cache — nunca mais um objeto congelado no momento em que o Sheet abriu.
9. ✅ **[Baixo] `refreshAll` do Dashboard não era estável → `eslint-disable` novo** — envolvido em `useCallback` com deps `[refreshDeals, refreshStages, refreshActivities, refreshContacts, refreshPipelines, refreshSalesGoals]` (todas estáveis, vêm de `useCallback(() => store.refresh(), [])` em `data-cache.ts`); o efeito do polling agora depende de `[refreshAll]` sem nenhum disable.

---

## 4. PENDENTE — decisões conscientes de não mexer (não são bugs a corrigir)

### 4.1 — Erros de fetch nunca aparecem na UI
**Onde:** `src/hooks/data-cache.ts` (campo `error` do estado) — nenhuma tela lê `error` retornado pelos hooks.
**O quê:** se `listX()` falhar (rede, gateway fora do ar), a tela só mostra lista vazia silenciosamente, sem mensagem de erro nem retry. Isso já era assim antes (não é regressão), mas a cache agora rastreia o erro internamente sem expor nada — seria baixo esforço conectar num toast ou banner por tela.
**Correção sugerida:** não crítico agora; documentar como melhoria futura (ex.: um componente `<DataErrorBanner error={error} onRetry={refresh} />` reutilizável).

### 4.2 — Duas convenções de "início da semana"
**Onde:** `src/lib/analytics.ts` (`getPeriodStart("this_week")`, semana começa **domingo**) vs. `src/lib/date.ts` (`getWeekRange()`, semana começa **segunda**).
**O quê:** inconsistência **pré-existente** (já estava assim em arquivos separados antes desta sessão; eu só centralizei cada uma sem unificar a convenção). Ficaram lado a lado no mesmo código-base.
**Por que não mexi:** mudar qual dia inicia "esta semana" no filtro de período do Dashboard alteraria silenciosamente o que "receita desta semana" significa — é mudança de comportamento de negócio, fora do escopo dos 11 itens da auditoria original. Deixar registrado para decisão explícita do time (padronizar em segunda-feira, convenção pt-BR).

### 4.3 — Itens fora de escopo, não tocados (contexto, não pendência real)
- **`docker-compose.yml`** (renomeação de volume `masia_pgdata_flowcrm` → `masia_pgdata_CellRM`) — já era uma mudança não commitada de sessão anterior à minha, não relacionada aos 11 itens da auditoria. Quem já tiver um volume Docker local antigo vai começar com banco vazio no próximo `docker compose up` — vale um aviso da equipe, não é algo que eu deva silenciosamente "corrigir" sem contexto de infra.
- **`.dark` removido de `src/index.css`** — também de sessão anterior à minha. Não há nenhum toggle de dark mode ativo na UI hoje (`AppHeader`/`AppSidebar` não têm switch), então não é uma regressão visível agora — mas se um dark mode for reintroduzido, os tokens custom properties só existem sob `:root`.
- **`index.html`**: `<title>` diz "CellRM — CRM de vendas" mas `og:title`/`twitter:title` ainda dizem "CellRM — CRM B2B Inteligente" — mesma raiz (find-replace incompleto de sessão anterior). Fácil de alinhar, não fiz por não ser parte dos 11 itens e por já estar identificado aqui.

---

## 5. Arquivos novos criados nesta sessão

```
src/hooks/data-cache.ts
src/hooks/useDeals.ts
src/hooks/useContacts.ts
src/hooks/useCompanies.ts
src/hooks/useActivities.ts
src/hooks/usePipelines.ts
src/hooks/useSalesGoals.ts
src/hooks/useSegments.ts
src/hooks/useLossReasons.ts
src/lib/domain.ts
src/lib/analytics.ts
src/lib/date.ts
src/lib/analytics.test.ts
src/lib/date.test.ts
src/lib/data/deals.repo.test.ts
src/components/crm/PipelineEditor.tsx
src/components/crm/ContactForm.tsx
src/components/crm/ActivityCreateEditModal.tsx
vitest.config.ts
eslint.config.js
```

`masi.template.json` (`editable.allow`/`protect`) já foi atualizado para refletir esses arquivos novos (`lib/domain.ts`, `lib/analytics.ts`, `lib/date.ts` → allow; `vitest.config.ts`, `eslint.config.js` → protect, junto com `vite.config.ts`).

---

## 6. Próximos passos recomendados (ordem sugerida)

1. **Smoke test manual no browser** (`npm run dev`) nas telas principais antes de publicar — único item de verificação que não pôde ser feito nesta sessão (sem ferramenta de automação de navegador disponível).
2. Decidir com o time a convenção de início de semana (item 4.2) antes de mexer nela — é mudança de comportamento de negócio, não um bug.
3. Avaliar se vale a pena surfacear erros de fetch na UI (item 4.1) — melhoria, não bloqueador.
4. Só depois disso, considerar `npm run build` final + publish conforme `Importantdoc.md` §B10 (fora do escopo desta auditoria de código).

Todos os itens antes listados como "pendente" (drag otimista de Contatos, drawers com snapshot congelado, `eslint-disable` novo no Dashboard) **foram corrigidos** nesta continuação — ver seção 3, itens 7–9. Verificação (tsc/vitest/eslint/build) re-executada e limpa após os fixes.
