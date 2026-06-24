# Publish — FlowCRM template (`slug: flowcrm`)

> Baseado em **Importantdoc.md §B10**. Execute todos os comandos a partir da raiz do repo
> `masi-ai-orquestration`, não daqui.

---

## Pré-requisitos (já satisfeitos neste template)

- [x] `pnpm build` passa limpo (tsc + vite, sem erros)
- [x] `tsc --noEmit` exit 0
- [x] `pnpm-lock.yaml` presente
- [x] Zero imports não usados
- [x] `masi.template.json` correto (engine, envContract, allow/protect)
- [x] Schema segue §B4 (owner_id, snake_case, sem RLS, sem nomes reservados)
- [x] `types.gen.ts` bate com o schema (12 tabelas V1)
- [x] `THIRD_PARTY.md` preenchido

---

## Passo 1 — Copiar o template para o repo de orquestração

```bash
cp -R "masia-template/" "masi-ai-orquestration/clone-templates/flowcrm/"
```

> Remova `node_modules/` e `dist/` da cópia se estiverem presentes.

---

## Passo 2 — Build compartilhado → R2 + KV

```bash
cd masi-ai-orquestration/clone-templates/flowcrm
npm install

cd masi-ai-orquestration
pnpm templates:publish flowcrm https://masi-tenant-gateway.fly.dev
```

> ⚠️ **Sempre passe a URL https do gateway.** Sem ela, o guardrail recusa ou embute
> `localhost` e todos os clones quebram no sign-up (404).

---

## Passo 3 — Deploy da demo

```bash
pnpm demo:publish flowcrm
# Fica disponível em: demo-flowcrm.masia.cloud
```

---

## Passo 4 — Migration de catálogo (control-plane)

Crie um arquivo em `masi-ai-orquestration/supabase/migrations/` espelhando
`20260620160001_clone_template_forms_nps.sql`.

Use os valores abaixo para o FlowCRM:

| campo            | valor                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| `slug`           | `flowcrm`                                                                              |
| `name`           | `FlowCRM`                                                                              |
| `description`    | `CRM de vendas: contatos, empresas, negócios (Kanban/BANT), atividades, tarefas, metas e dashboard.` |
| `category`       | `crm`                                                                                  |
| `status`         | `published`                                                                            |
| `latest_version` | `1.0.0`                                                                                |
| `demo_url`       | `https://demo-flowcrm.masia.cloud`                                                     |
| `version`        | `1.0.0`                                                                                |
| `manifest`       | conteúdo de `masi.template.json` (jsonb)                                               |
| `changelog`      | `"Versão inicial V1 — CRM de vendas multi-tenant"`                                     |

> Adapte a estrutura exata dos INSERTs ao schema real do `forms_nps` —
> não há acesso ao schema de controle daqui.

---

## Passo 5 — Redeploy do serviço Fly

```bash
# No repo masi-ai-orquestration:
fly deploy
```

> O provisionador e o editor leem os arquivos do template **do disco da imagem**
> (o `Dockerfile` faz `COPY clone-templates`). Sem redeploy, provisão/edição dá `ENOENT`.

---

## Gotchas (§B10 Importantdoc)

- Clones **existentes** ficam pinados ao build da provisão — re-publish não os atualiza.
  Para pegar um build novo, o cliente precisa re-clonar.
- O `pnpm templates:publish` **sem** a URL https embute `localhost` silenciosamente.
  Resultado: sign-up retorna 404 para todos os clones.
