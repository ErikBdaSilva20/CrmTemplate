---
title: 'Remove Segments and Settings (Épicos 07 e 08)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Remove Segments and Settings (Épicos 07 e 08)

## Intent

**Problem:** `fix.md` pede a remoção completa de duas telas que não agregam valor no estado atual do
produto: `/segments` ("Filtros Salvos", nunca evoluído além de um MVP) e `/settings` (decisão do usuário:
Opção 1 — remover por completo, aceitando a perda de gestão de Tags/Loss Reasons/criação de Pipelines pela UI).

**Approach:** Deletar telas, hooks, repos, rotas e navegação; remover a tabela `segments` do schema
(`0001_business_schema.sql` + `types.gen.ts`); limpar os dois pontos de uso de segments que ficavam nas
telas de Contacts e Deals (dropdown "Segmentos"/filtros salvos).

## Suggested Review Order

**Segments — remoção completa**

- Arquivos deletados: `src/screens/SegmentsScreen.tsx`, `src/hooks/useSegments.ts`,
  `src/lib/data/segments.repo.ts`.
- `src/lib/data/index.ts` — barrel não reexporta mais `segments.repo`.
- `src/server.ts` — `TABLES_WITH_OWNER` não inclui mais `segments`.
- `supabase/migrations/0001_business_schema.sql` — tabela/índice/trigger de `segments` removidos; comentário
  documenta `drop table if exists segments cascade;` para ambientes já provisionados.
  [`0001_business_schema.sql:234`](../../supabase/migrations/0001_business_schema.sql#L234)
- `src/lib/data/types.gen.ts` — tipo `segments` (Row/Insert/Update) removido.
- `src/screens/ContactsScreen.tsx` e `src/screens/DealsScreen.tsx` — dropdown "Segmentos"
  (`applySegment`/`clearSegment`/`activeSegmentId`/`useSegments`) removido; demais filtros intactos.

**Settings — remoção completa (Opção 1, decisão do usuário)**

- Arquivo deletado: `src/screens/SettingsScreen.tsx`. Tags, Loss Reasons e criação/exclusão de Pipelines
  deixam de ter tela de gestão dedicada (perda de capacidade aceita explicitamente).
  `PipelineEditor`/`usePipelines`/`useLossReasons` continuam existindo — ainda usados pelo dialog
  "Personalizar pipeline" em `DealsScreen`.
- `src/components/crm/PipelineEditor.tsx` — comentário desatualizado que citava `SettingsScreen` corrigido.

**Rotas e navegação (ambos os épicos, tratados juntos por tocarem os mesmos arquivos)**

- `src/App.tsx` — lazy imports e `<Route>` de `/segments` e `/settings` removidos; ambas as URLs agora caem
  no `NotFoundScreen`.
- `src/components/layout/AppSidebar.tsx` — item "Filtros Salvos" removido de `analyticsItems`; grupo
  `adminItems`/"Admin" removido por inteiro (só continha "Configurações"); imports órfãos de `Filter`/`Settings`
  removidos.
- `src/components/layout/AppHeader.tsx` — entradas de breadcrumb para `/segments`/`/settings` removidas.
- `src/components/layout/MobileBottomNav.tsx` — itens do menu "Mais" removidos.

## Verification

- `npx tsc -b` limpo (`noUnusedLocals`/`noUnusedParameters` ativos em `tsconfig.app.json` — confirma ausência
  de imports/variáveis órfãos).
- `npx vite build` limpo.
