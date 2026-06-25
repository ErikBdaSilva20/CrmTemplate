# Auditoria do template `masia-template` (FlowCRM)

> **Data:** 2026-06-25
> **Escopo:** pasta `masia-template/` (slug `flowcrm`)
> **Referência de contrato:** `../Importantdoc.md` (Guia do time — Apps Prontos)
> **Método:** revisão estática dos arquivos + `npm run build` (`tsc -b && vite build`)

## Sumário executivo

| # | Achado | Severidade | Arquivo(s) |
|---|--------|-----------|------------|
| 1 | Build quebrado (`cc;` + props faltando) | 🔴 Crítico | `AppHeader.tsx`, `AppLayout.tsx` |
| 2 | TypeScript não-strict (`strict/noUnusedLocals = false`) | 🔴 Crítico | `tsconfig.app.json` |
| 3 | `react-router-dom` v6 (contrato exige v7) | 🟠 Alto | `package.json` |
| 4 | `vite` v5 (contrato exige v6) | 🟠 Alto | `package.json` |
| 5 | Manifest protege `registry.tsx` inexistente | 🟠 Alto | `masi.template.json` |
| 6 | Lockfile divergente (pnpm vs npm) | 🟠 Alto | raiz |
| 7 | Conflito de tema (`class="dark"` hardcoded) | 🟡 Médio | `index.html`, `main.tsx` |
| 8 | Assets/branding do Lovable vazados | 🟡 Médio | `index.html` |
| 9 | Busca removida pela metade (hook órfão) | 🟡 Médio | `AppHeader.tsx`, `useKeyboardShortcuts.ts` |
| 10 | `editable.allow` não cobre `layout/`, `hooks/`, `NavLink` | 🟡 Médio | `masi.template.json` |
| 11 | `auth.tsx` é placeholder marcado como `protect` | 🟡 Médio | `auth.tsx`, `masi.template.json` |
| 12 | Possível dead code (`use-toast` duplicado, `useDebounce`) | ⚪ Baixo | `src/hooks/` |
| 13 | `ParticlesCanvas` não-shadcn dentro de `ui/` | ⚪ Baixo | `src/components/ui/` |
| 14 | Triggers sem idempotência | ⚪ Baixo | `0001_business_schema.sql` |
| 15 | `.env.example` não verificado (permissão) | ⚪ Baixo | `.env.example` |

**Severidade:** 🔴 quebra build/publish · 🟠 viola contrato · 🟡 atenção · ⚪ informativo

---

## ✅ Em conformidade (não mexer — está certo)

- **Schema (§B4) — impecável.** `owner_id text not null references "user"(id) on delete cascade` em **toda** tabela escrita pelo rep, **inclusive filhas** (`contact_tags`, `deal_tags`). Lookups (`pipelines`, `pipeline_stages`, `tags`, `loss_reasons`) corretamente **sem** `owner_id`. Sem RLS / `auth.uid()` / `profiles` / `org_id`. `snake_case` minúsculo; sem nomes reservados (`order` → `sort_order`).
- **Camada de dados (§B5).** Acesso **só** via `db`/`auth` de `client.ts`. **Zero** `@supabase`/`firebase`/fetch cru/driver SQL no browser. `owner_id` **nunca** enviado do front (confirmado em todos os repos e telas). Detalhe de negócio usa **list-then-find** (`deals.repo.getDeal`), sem `GET /data/:table/:id`. Joins resolvidos no front (`enrichDeals`).
- **`types.gen.ts`** bate 1:1 com o schema. **Preview** (`preview-fixtures.ts`) implementa store em memória + RBAC por `OWNER_TABLES`.

---

## 🔴 Crítico 1 — Build quebrado

`npm run build` falha:

```
src/components/layout/AppLayout.tsx(16,12): error TS2739: Type '{}' is missing the
following properties from type 'AppHeaderProps': cc, onOpenSearch
```

**Causa raiz:** o commit `style: removed search inputs` removeu a busca pela metade. Em `src/components/layout/AppHeader.tsx:32-37`:

```ts
interface AppHeaderProps {
  cc;                          // ← propriedade lixo, sem tipo (inválida)
  onOpenSearch: () => void;    // ← prop ainda exigida
}

export function AppHeader({ onOpenSearch }: AppHeaderProps) {
```

E `src/components/layout/AppLayout.tsx:16` renderiza `<AppHeader />` **sem nenhuma prop**.

**Mudança necessária (opção A — concluir a remoção da busca, recomendada):**

Em `AppHeader.tsx`:
- Remover a `interface AppHeaderProps` inteira (linhas 32-35).
- Trocar a assinatura para `export function AppHeader() {`.
- Remover o `<button onClick={onOpenSearch} ...>` de busca (linhas ~103-111).
- Remover o import `Search` de `lucide-react` (linha 17).

Em `AppLayout.tsx`: nada a mudar (`<AppHeader />` já está sem props).

**Opção B — restaurar a busca:** criar o estado/handler de busca em `AppLayout`, passar `onOpenSearch={...}` para `<AppHeader />`, e remover apenas o `cc;`. Só faz sentido se a busca vai voltar.

**Validação:** `npm run build` deve passar sem erros.

---

## 🔴 Crítico 2 — TypeScript não-strict

`tsconfig.app.json` está afrouxado, violando §B3 ("TypeScript strict (`noUnusedLocals`) — imports não usados quebram o build") e §B10 ("zero imports não usados"):

```jsonc
{
  "compilerOptions": {
    "noImplicitAny": false,      // ← deveria ser true (ou herdar do strict)
    "noUnusedLocals": false,     // ← §B3 exige true
    "noUnusedParameters": false, // ← recomendado true
    "strict": false,             // ← §B3 exige strict
    // ...
  }
}
```

**Risco:** imports mortos e erros de tipo passam batido localmente e podem estourar no pipeline de publish (que espera build limpo) ou no self-heal.

**Mudança necessária:**

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    // remover noImplicitAny: false
    // ...
  }
}
```

> ⚠️ Fazer **depois** do Crítico 1. Ao ligar `strict`/`noUnusedLocals`, novos erros (imports/variáveis não usadas, `any` implícito) vão aparecer e precisam ser limpos um a um até `npm run build` passar.

---

## 🟠 Alto 3 — `react-router-dom` v6 (contrato exige v7)

`package.json`:

```json
"react-router-dom": "^6.30.1"
```

§B3 manda **react-router-dom 7**. O app usa API v6 (`BrowserRouter`, `Routes`, `useNavigate`, `useLocation`) — a migração para v7 é majoritariamente compatível, mas precisa ser feita e testada.

**Mudança necessária:**
```bash
npm install react-router-dom@^7
```
Depois validar rotas (`App.tsx`), `BrowserRouter`, lazy routes e os hooks de navegação.

---

## 🟠 Alto 4 — `vite` v5 (contrato exige v6)

`package.json`:

```json
"vite": "^5.4.19"
```

§B3 manda **Vite 6**.

**Mudança necessária:**
```bash
npm install -D vite@^6
```
Validar `vite.config.ts` e o build. Conferir compatibilidade do `@vitejs/plugin-react-swc`.

---

## 🟠 Alto 5 — Manifest protege arquivo inexistente

`masi.template.json` → `editable.protect` lista:

```json
"src/components/registry.tsx",
```

O arquivo **não existe** em `src/components/` e **nada o importa** (`main.tsx` não usa registry).

**Mudança necessária (escolher uma):**
- **A)** Se o scaffold de fato usa um `registry.tsx` (§B7 lista no protect), criar o arquivo a partir do scaffold canônico.
- **B)** Se este template não usa registry, **remover a linha** do `protect`.

---

## 🟠 Alto 6 — Lockfile divergente

A raiz tem **apenas** `pnpm-lock.yaml`; não há `package-lock.json`. §B10 (pré-requisitos) pede *"`package-lock.json` commitado"*, e a receita de publish mistura `npm install` + `pnpm templates:publish`.

**Mudança necessária:** padronizar o gerenciador.
- Se for **npm**: rodar `npm install`, commitar `package-lock.json`, remover `pnpm-lock.yaml`.
- Se for **pnpm**: alinhar a doc/receita de publish e confirmar que o pipeline aceita `pnpm-lock.yaml`.

---

## 🟡 Médio 7 — Conflito de tema (`class="dark"` hardcoded)

`index.html:2`:
```html
<html lang="pt-BR" class="dark">
```

`src/main.tsx:5-11` **também** define o tema a partir do `localStorage` (default `"light"`):
```ts
const savedTheme = localStorage.getItem("fc-theme") || "light";
// ...
document.documentElement.classList.add(savedTheme); // adiciona "light"
```

Resultado: o `<html>` fica com **`class="dark light"`** simultaneamente → comportamento de tema imprevisível.

**Mudança necessária:** remover o `class="dark"` fixo do `index.html` (deixar `<html lang="pt-BR">`) e deixar o `main.tsx` ser a fonte única do tema.

---

## 🟡 Médio 8 — Assets/branding do Lovable vazados

`index.html`:
- `og:image` e `twitter:image` (linhas ~24-30) apontam para uma URL de preview **`*.lovable.app`** hospedada no R2 — resquício da origem Lovable.
- `<title>` e metas dizem **"MasIA CRM"/"MasIa Crm"** (linhas 6, 13), enquanto o app é **FlowCRM** (manifest `name` + breadcrumb em `AppHeader`).

**Mudança necessária:**
- Trocar `og:image`/`twitter:image` por um asset próprio (ou remover até existir).
- Padronizar o branding (decidir entre "FlowCRM" e "MasIA CRM" e aplicar em `title`, metas, breadcrumb e manifest de forma consistente).

---

## 🟡 Médio 9 — Busca removida pela metade

Resíduo do commit `style: removed search inputs`:
- `AppHeader.tsx` ainda tem o botão de busca + prop `onOpenSearch` (tratado no Crítico 1).
- `src/hooks/useKeyboardShortcuts.ts` ficou **órfão**: define `onOpenSearch` e o atalho, mas **ninguém importa o hook** (nenhum outro arquivo o referencia).

**Mudança necessária:** decidir o destino da busca.
- **Remover de vez:** apagar `src/hooks/useKeyboardShortcuts.ts` (e o botão/prop do `AppHeader`, ver Crítico 1).
- **Restaurar:** religar a busca (CommandPalette/atalho) em `AppLayout`, importar e usar `useKeyboardShortcuts`, e passar `onOpenSearch` ao `AppHeader`.

---

## 🟡 Médio 10 — Cobertura de `editable.allow` incompleta

`masi.template.json` → `editable.allow` cobre `src/components/crm/**`, mas **não** cobre arquivos específicos do app que deveriam ser editáveis pela IA:
- `src/components/layout/**` (AppHeader, AppSidebar, AppLayout, MobileBottomNav)
- `src/components/NavLink.tsx`
- `src/hooks/**`

Esses ficam **fora de allow E fora de protect** (limbo): a IA não pode editá-los, mas também não são contrato do gateway.

**Mudança necessária:** adicionar ao `allow` (sugestão):
```json
"src/components/layout/**",
"src/components/NavLink.tsx",
"src/hooks/**"
```
(mantendo `src/components/ui/**` em `protect`, como já está).

---

## 🟡 Médio 11 — `auth.tsx` é placeholder marcado como `protect`

`src/lib/auth.tsx` se auto-documenta no topo como **PLACEHOLDER** — no template real deve ser herdado do scaffold `wiki` (§B-Receita passo 7). Ao mesmo tempo está em `editable.protect` no manifest.

**Mudança necessária:** antes do publish, **substituir** `auth.tsx` pelo arquivo oficial do scaffold (não publicar o placeholder). Manter em `protect` está correto — desde que seja o arquivo real.

---

## ⚪ Baixo 12 — Possível dead code

- `use-toast` duplicado: `src/hooks/use-toast.ts` **e** `src/components/ui/use-toast.ts`.
- `src/hooks/useDebounce.ts` — confirmar se é usado.

**Mudança necessária:** com `noUnusedLocals` ligado (Crítico 2) e uma busca de imports, remover o que não for usado. Manter só uma fonte de `use-toast`.

---

## ⚪ Baixo 13 — `ParticlesCanvas` dentro de `ui/`

`src/components/ui/ParticlesCanvas.tsx` é um componente **não-shadcn** dentro da pasta `ui/` (que é `protect`). Pode ser um efeito visual herdado.

**Mudança necessária:** confirmar necessidade e impacto no bundle. Se for específico do app (não shadcn), considerar movê-lo para fora de `ui/` (ex.: `src/components/`) e adicioná-lo ao `allow`.

---

## ⚪ Baixo 14 — Triggers sem idempotência

`supabase/migrations/0001_business_schema.sql`: as tabelas usam `create table if not exists`, mas os `create trigger trg_*` **não** têm guarda. Re-rodar a migration falharia nos triggers.

**Mudança necessária (opcional, defensivo):** usar `drop trigger if exists ... ; create trigger ...` ou `create or replace trigger` (PG 14+). Risco real baixo: a migration roda 1×/tenant.

---

## ⚪ Baixo 15 — `.env.example` não verificado

Não foi possível ler `.env.example` nesta auditoria (bloqueio de permissão a dotfiles). `.env` e `.env.local` estão no `.gitignore` (correto).

**Mudança necessária:** validar manualmente que `.env.example` contém apenas o que `envContract` declara — `VITE_GATEWAY_URL` (+ eventualmente `VITE_PREVIEW_MODE` para o preview local).

---

## Ordem de execução sugerida

1. **Crítico 1** — desbloquear o build (remover `cc;` + finalizar remoção da busca).
2. **Médio 9** — limpar o hook órfão `useKeyboardShortcuts` (parte da mesma remoção).
3. **Crítico 2** — ligar `strict`/`noUnusedLocals` e limpar os erros que surgirem (pega o Baixo 12 de quebra).
4. **Médio 7 e 8** — corrigir `index.html` (tema + branding/OG do Lovable).
5. **Alto 5, 10, 11** — acertar o `masi.template.json` (registry, allow, auth real).
6. **Alto 3 e 4** — subir `react-router-dom` para v7 e `vite` para v6, testando.
7. **Alto 6** — padronizar lockfile.
8. **Baixos 13, 14, 15** — limpeza final e validação de env.
9. **E2E (§B10)** — `npm install && npm run build` limpo, depois publish + catálogo + demo + Fly redeploy.
