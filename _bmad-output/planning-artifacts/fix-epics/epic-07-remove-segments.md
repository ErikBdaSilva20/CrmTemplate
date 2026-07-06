---
epic: 7
title: Remover Segments — tela, código e tabela por completo
block: 'fix.md §7'
depends_on: []
enables: [2, 4]
---

# Épico 07 — Remover /segments (tela + código + schema)

## Objetivo

Remover **por completo** a tela `/segments` e todo o seu código, para não ocupar espaço à toa — incluindo a
remoção da tabela `segments` do schema (coordenado com o Épico 09).

## Superfície de remoção (grep confirmado)

Arquivos que referenciam segments:

- `src/screens/SegmentsScreen.tsx` — **deletar**.
- `src/hooks/useSegments.ts` — **deletar**.
- `src/lib/data/segments.repo.ts` — **deletar**.
- `src/lib/data/index.ts:17` — `export * from "./segments.repo";` → **remover**.
- `src/lib/data/types.gen.ts` — remover o tipo da tabela `segments` (Row/Insert/Update).
- `src/App.tsx` — remover `const SegmentsScreen = lazy(...)` e a `<Route path="/segments" ...>`.
- `src/components/layout/AppSidebar.tsx:41` — item `{ title: 'Filtros Salvos', url: '/segments', icon: Filter }`
  → **remover** (e o import de `Filter` se ficar órfão).
- `src/components/layout/AppHeader.tsx` — referências a segments → **remover**.
- `src/components/layout/MobileBottomNav.tsx` — referências a segments → **remover**.
- `src/server.ts` — referências a segments (dev server) → **remover**.
- `src/screens/ContactsScreen.tsx` — dropdown de segmentos → tratado no **Épico 02** (Story 2.1).
- `src/screens/DealsScreen.tsx` — dropdown de segmentos → tratado no **Épico 04** (Story 4.5).
- `supabase/migrations/0001_business_schema.sql:235-247` — tabela `segments` + índice + trigger → **Épico 09**.

---

### Story 7.1: Remover a tela e a rota de Segments

Como **usuário**,
quero **`/segments` fora do app**,
para que **não haja tela morta**.

**Acceptance Criteria:**

**Given** o app
**When** navego para `/segments`
**Then** a rota não existe mais (cai no `NotFoundScreen`)
**And** `SegmentsScreen.tsx` foi deletado e removido do `App.tsx` (lazy import + rota).

### Story 7.2: Remover navegação para Segments

Como **usuário**,
quero **os menus sem "Filtros Salvos/Segmentos"**,
para que **a navegação reflita a remoção**.

**Acceptance Criteria:**

**Given** sidebar, header e bottom nav
**When** renderizados
**Then** não há item apontando para `/segments`
**And** imports de ícones/consts que ficaram órfãos (ex.: `Filter` em `AppSidebar`) são removidos.

### Story 7.3: Remover camada de dados de Segments

Como **desenvolvedor**,
quero **hook, repo e exports de segments removidos**,
para que **nenhum código de segments permaneça**.

**Acceptance Criteria:**

**Given** o código-fonte
**When** busco por `segment`/`Segment` em `src/**` (exceto ocorrências não relacionadas)
**Then** `useSegments.ts` e `segments.repo.ts` não existem, `index.ts` não os reexporta, e o tipo `segments`
saiu de `types.gen.ts`
**And** `src/server.ts` não trata mais a tabela `segments`
**And** `tsc && vite build` passa sem imports/símbolos órfãos.

### Story 7.4: Remover a tabela `segments` do schema

Como **desenvolvedor**,
quero **a tabela `segments` fora da migration**,
para que **o schema não guarde uma tabela sem uso** (coordena com Épico 09).

**Acceptance Criteria:**

**Given** `supabase/migrations/0001_business_schema.sql`
**When** removo o bloco `create table ... segments`, o índice `idx_segments_owner` e o trigger `trg_segments_touch`
**Then** o arquivo continua idempotente e válido
**And** a remoção está registrada no Épico 09 com nota sobre `drop table if exists segments` em ambientes já provisionados.

## Notas / cuidados

- **Dependência de ordem:** rodar antes/junto de Épico 02 e 04 (que removem os *usos* de segments nas telas),
  para o build não quebrar por referência a `useSegments` já deletado.
- Confirmar que nada além de "filtros salvos" dependia da tabela (grep já indica que não).
