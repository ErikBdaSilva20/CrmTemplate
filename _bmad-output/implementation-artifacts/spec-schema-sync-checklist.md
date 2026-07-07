---
title: 'Schema↔Code Sync Checklist (Épico 09, Story 9.3)'
type: 'checklist'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Schema↔Code Sync Checklist (Épico 09, Story 9.3)

Checklist final do lote `fix-epics` (Épicos 01–09), confirmando a regra transversal: toda mudança de banco
está refletida em `0001_business_schema.sql` **e** `src/lib/data/types.gen.ts`, e nenhum épico front-only
tocou o schema por engano.

| Épico | Escopo de schema esperado | Confirmado |
|---|---|---|
| 01 (Dashboard) | front-only | ✅ `0001_business_schema.sql` não tocado no commit `c4662c4` |
| 02 (Contacts) | front-only | ✅ não tocado no commit `1bb8ca1` |
| 03 (Companies/CSV) | front-only | ✅ não tocado no commit `a896346` |
| 04 (Deals Kanban) | front-only | ✅ não tocado no commit `ea64f87` |
| 05 (Tasks Kanban) | front-only | ✅ não tocado no commit `f6321f5` |
| 06 (Sales Goals OKR) | aditiva | ✅ `sales_goals.deal_id`/`company_id` (nullable, `on delete set null`) |
| 07 (Remover Segments) | remoção | ✅ tabela `segments` + índice + trigger removidos |
| 08 (Remover Settings) | nenhuma | ✅ Pipelines/Tags/Loss Reasons permanecem no banco (Opção 1: só a UI de gestão saiu) |
| 09 (este checklist) | — | ✅ |

**Verificação cruzada:** `grep -oE "create table if not exists [a-z_]+"` na migration e as chaves top-level de
`types.gen.ts` retornam a mesma lista de 11 tabelas (`activities, companies, contact_tags, contacts,
deal_tags, deals, loss_reasons, pipeline_stages, pipelines, sales_goals, tags`) — sem tabela a mais ou a menos
de nenhum dos lados.

**Build/testes (estado final do lote):**
- `npx tsc -b` — limpo.
- `npx vitest run` — 56 testes passando.
- `npx vite build` — limpo.

**Não executado nesta sessão:** aplicar a migration num Postgres real
(`docker compose exec -T db psql -U masia -d tenant_local < supabase/migrations/0001_business_schema.sql`)
fica a critério do usuário, que testa o front/back localmente por conta própria.

## Nota sobre `deferred-work.md`

As 4 pendências herdadas de sessões anteriores foram resolvidas nos Épicos 01 e 04 (ver
`deferred-work.md`, atualizado nesta sessão), com uma exceção documentada: a ambiguidade de
`qualification_score === 0` ("nunca avaliado" vs. "desqualificado") permanece na lógica de cálculo
(`calcQualScore`), mas `dealPriority` já trata `0` como "nunca avaliado" ao decidir prioridade, conforme a
cláusula de limitação documentada do próprio épico.
