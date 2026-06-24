# Third-party / Origem

Este template foi **portado** a partir do projeto interno **FlowCRM** (gerado via Lovable —
Vite + React + shadcn/ui + Supabase). O backend original (Supabase: 15 Edge Functions, RLS,
`profiles`/`user_roles`/`org_id`, realtime) foi **descartado**; o front foi reconstruído como
SPA pura falando apenas com o `tenant-gateway` (Better-Auth + `/data/:table`), conforme
`Importantdoc.md` e `docs/10-port-masia-conformidade.md`.

## Componentes de UI

- **shadcn/ui** — MIT. Componentes em `src/components/ui/**` (herdados do scaffold `wiki`).
- **lucide-react** — ISC. Ícones.
- **recharts** — MIT. Gráficos do Dashboard.
- **@dnd-kit** — MIT. Drag-and-drop dos Kanban (Negócios, funil de Contatos).
- **sonner** — MIT. Toasts.

## Markup adaptado

As telas e componentes em `src/screens/**` e `src/components/crm/**` derivam do markup do
FlowCRM (projeto interno). Nenhum código de OSS de terceiros com licença restritiva foi copiado.

## Logos de empresas

As telas de Empresas usam `logo.clearbit.com` para logos por domínio (serviço externo, best-effort;
falha silenciosa via `onError`). Pode ser removido/trocado sem impacto funcional.
