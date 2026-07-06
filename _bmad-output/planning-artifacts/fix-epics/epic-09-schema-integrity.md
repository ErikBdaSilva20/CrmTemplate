---
epic: 9
title: Integridade do schema — 0001_business_schema.sql e types.gen.ts em sincronia
block: 'fix.md §9 (obs. transversal)'
depends_on: []
enables: [6, 7]
---

# Épico 09 — Integridade do schema (regra transversal do fix.md)

## Objetivo

Garantir que **toda tela com alteração de banco** mantenha `supabase/migrations/0001_business_schema.sql`
atualizado — **se algo é removido, remover de lá também** — e que `src/lib/data/types.gen.ts` espelhe o schema.
Este épico centraliza as mudanças de schema deste lote e serve de *checklist* para os demais.

## Regras (Importantdoc §B4)

- `snake_case`; sem `org_id`/RLS/`auth.uid()`/`profiles`/`SECURITY DEFINER`; sem nomes reservados.
- Toda tabela escrita pelo rep tem `owner_id text not null references "user"(id) on delete cascade`
  (inclusive filhas). `owner_id` nunca é enviado do front.
- `id uuid PK + created_at/updated_at` + trigger `touch_updated_at` (onde houver `updated_at`).
- Mudanças **aditivas** (colunas nullable) para features novas; migration **idempotente**
  (`add column if not exists` / `create table if not exists`).
- `types.gen.ts` é arquivo "protegido" como código de app, mas **deve** ser espelhado quando o schema muda
  (é a única exceção coordenada — atualizar Row/Insert/Update juntos).

## Mudanças de schema deste lote

| Origem | Mudança | Tipo |
|---|---|---|
| Épico 06 (Sales Goals OKR) | `sales_goals` ganha `deal_id uuid references deals(id) on delete set null` e `company_id uuid references companies(id) on delete set null` | **Aditiva** |
| Épico 07 (Remover Segments) | Remover tabela `segments` + `idx_segments_owner` + `trg_segments_touch` | **Remoção** |

> Demais épicos (01 Dashboard, 02 Contacts, 03 Companies, 04 Deals Kanban, 05 Tasks, 08 Settings) são
> **front-only** — **não** tocam o schema. Confirmar isso é parte do *checklist* (Story 9.3).

---

### Story 9.1: Migration aditiva — vínculo de metas (com Épico 06)

Como **desenvolvedor**,
quero **`sales_goals` com `deal_id`/`company_id` opcionais na migration e nos tipos**,
para que **o OKR do Épico 06 tenha base de dados consistente**.

**Acceptance Criteria:**

**Given** `0001_business_schema.sql`
**When** adiciono as colunas de forma idempotente (`alter table sales_goals add column if not exists ...`)
**Then** ambas são `nullable` com FK `on delete set null`
**And** `types.gen.ts` reflete as colunas em `sales_goals` Row/Insert/Update
**And** rodar a migration duas vezes não quebra.

### Story 9.2: Remoção — tabela `segments` (com Épico 07)

Como **desenvolvedor**,
quero **a tabela `segments` removida do schema e dos tipos**,
para que **o banco não guarde estrutura sem uso**.

**Acceptance Criteria:**

**Given** `0001_business_schema.sql`
**When** removo o `create table ... segments`, `idx_segments_owner` e `trg_segments_touch`
**Then** o arquivo permanece válido e idempotente
**And** `types.gen.ts` não tem mais o tipo `segments`
**And** há uma nota documentando `drop table if exists segments cascade;` para ambientes já provisionados
(a migration base é o estado desejado; ambientes existentes precisam do drop explícito)
**And** nenhum código referencia mais `segments` (cruzar com Épico 07).

### Story 9.3: Checklist de sincronia schema ↔ código

Como **desenvolvedor**,
quero **um checklist confirmando que cada épico deste lote respeitou a regra transversal**,
para que **nenhuma mudança de dados fique fora do `0001_business_schema.sql`/`types.gen.ts`**.

**Acceptance Criteria:**

**Given** o lote concluído
**When** reviso cada épico
**Then** confirmo: 01/02/03/04/05/08 = front-only (schema intocado); 06 = aditiva aplicada; 07 = remoção aplicada
**And** `types.gen.ts` bate com o schema (sem tabela/coluna a mais ou a menos)
**And** `tsc && vite build` passa limpo
**And** (se ambiente local com Postgres do `docker-compose.yml`) a migration aplica sem erro:
`docker compose exec -T db psql -U masia -d tenant_local < supabase/migrations/0001_business_schema.sql`.

## Notas

- Não introduzir `get-by-id`/join no gateway: relações novas (`deal_id`/`company_id` em metas) são resolvidas
  no front por *list-then-filter*.
- `types.gen.ts` só é alterado aqui de forma coordenada com a migration; nenhum outro épico deve editá-lo.
