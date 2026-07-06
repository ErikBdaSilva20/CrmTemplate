---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - fix.md
  - _bmad-output/implementation-artifacts/deferred-work.md
  - _bmad-output/implementation-artifacts/spec-dashboard-pipeline-expandable.md
  - _bmad-output/implementation-artifacts/spec-deal-status-editing.md
  - _bmad-output/implementation-artifacts/spec-kanban-bant-qualification.md
  - supabase/migrations/0001_business_schema.sql
generatedBy: John (PM) — bmad-create-epics-and-stories
---

# CellRM — Lote de Correções (`fix.md`) — Índice de Épicos

## Visão geral

Este lote decompõe as mudanças solicitadas em [`fix.md`](../../../fix.md) em **9 épicos numerados por bloco**,
prontos para serem executados em uma sessão de desenvolvimento (agente Dev / `bmad-dev-story`).

**Contexto do produto:** CellRM é um SPA **React 19 + Vite + TypeScript strict**, sem backend próprio.
Todo acesso a dados passa por `src/lib/data/client.ts` (`db`/`auth`) contra o **tenant-gateway** via CRUD
genérico (`/data/:table`). **Não há get-by-id nem join** — toda tela usa *list-then-filter* e resolve
relações no front. `owner_id` é setado pelo gateway e **nunca** enviado do front. Schema em `snake_case`,
sem RLS/`profiles`. UI com shadcn/ui. Ver `Importantdoc.md`.

## O que já foi feito (sessão anterior) — NÃO refazer

Registrado em `_bmad-output/implementation-artifacts/`. Já commitado e no front:

| Artefato | Commit | Status |
|---|---|---|
| Pipeline por Estágio expansível (mostra deals ao expandir o estágio) | `6baff81` | ✅ feito |
| BANT (`QualificationBar`) nos cards do Kanban de deals abertos | `e6ea838` | ✅ feito |
| Editar/reabrir status Won/Lost no `DealDetailScreen` | `29bd2d8` | ✅ feito |

> ⚠️ **Importante:** o `fix.md` (bloco 1) pede para **substituir** o card "Pipeline por Estágio" por um card
> **novo** (lista expansível de até 4 *deals* com BANT/contato/empresa/fechamento/atividades). Ou seja, o
> trabalho já feito (deixar as barras de estágio expansíveis) **não** atende o bloco 1 — é um card diferente.
> O Épico 01 descreve o card novo e decide o destino do card antigo.

### Pendências herdadas (`deferred-work.md`) — dobradas nos épicos

- BANT não aparece nos cards **Won/Lost** do Kanban (`CollapsibleStatusColumn`). → Épico 04.
- `QualificationBar`/`LeadScoreBadge`/helpers vivem em `DealQualification.tsx` (módulo *stateful*); extrair os
  presentacionais para `QualificationBar.tsx` evita import circular. → Épico 01 (habilita reuso limpo).
- `qualification_score === 0` confunde "nunca avaliado" com "desqualificado". → Épico 04 (priorização).
- `<Select>` de estágio no `DealDetailScreen` não é bloqueado por status; `markAsWon`/`confirmLoss`/`reopenDeal`
  sem try/catch nem *guard* de re-entrância. → Épico 04 (higiene de deals).

## Mapa de cobertura (fix.md → épicos)

| Bloco do `fix.md` | Épico |
|---|---|
| Dashboard: trocar card "Pipeline por Estágio" por lista expansível de até 4 deals (BANT/contato/empresa/fechamento/atividades) via componente reutilizável | **01** |
| /contacts: remover selects de segmentos; garantir import/export; garantir todos os filtros | **02** |
| /companies: garantir import/export; componente reutilizável compartilhado com contacts | **03** |
| /deals Kanban: todos os deals ativos, status + BANT, priorizar quem precisa de atenção | **04** |
| /tasks: Kanban de tarefas (responsável, empresa etc.) | **05** |
| /sales-goals: melhorar UI + atrelar meta a deal ou empresa (conceito OKR) | **06** |
| /segments: remover tela + código por completo | **07** |
| /settings: remover tela + código por completo | **08** |
| Manter `0001_business_schema.sql` atualizado para toda mudança de banco | **09** |

## Componentes reutilizáveis criados neste lote

- **`EntityInfoCard`** (Épico 01) — exibe informações de um deal (BANT, contato, empresa, fechamento,
  atividades). Reutilizado no Dashboard (Épico 01) e como referência no Kanban de deals (Épico 04).
- **`QualificationBar` extraído** (Épico 01) — helpers presentacionais fora do módulo *stateful*.
- **`CSVImportModal` (já existe, reutilizável por `entityType`)** — garantido/consertado nos Épicos 02 e 03.
- **`useCsvExport` / util de export** (Épico 03) — extrai o `exportCSV` duplicado de Contacts e Companies.

## Ordem de execução recomendada

Do mais estrutural/dependência para o mais isolado:

1. **Épico 09** (schema) — pré-requisito das colunas de metas (06) e da remoção de segments (07).
2. **Épico 07** (remover segments) — desbloqueia limpeza de Contacts (02) e Deals (04).
3. **Épico 08** (remover settings) — **tem decisão pendente** (ver épico: para onde vão Pipelines/Tags/Loss Reasons).
4. **Épico 01** (card do Dashboard + `EntityInfoCard` + extração da `QualificationBar`).
5. **Épico 02** (Contacts) e **Épico 03** (Companies) — compartilham import/export.
6. **Épico 04** (Deals Kanban) — usa `EntityInfoCard` e a `QualificationBar` extraída.
7. **Épico 05** (Tasks Kanban).
8. **Épico 06** (Sales Goals OKR) — depende do schema (09).

## Regra transversal (todos os épicos)

Toda story que alterar dados **deve** manter `supabase/migrations/0001_business_schema.sql` e
`src/lib/data/types.gen.ts` em sincronia (aditivo se cria coluna; remoção se apaga tabela). Ver Épico 09.
`tsc && vite build` tem que passar limpo, sem imports não usados.
