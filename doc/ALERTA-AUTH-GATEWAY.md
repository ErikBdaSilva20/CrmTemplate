# ⚠️ Alerta — Auth real via gateway (leia antes de configurar `VITE_GATEWAY_URL` em produção)

**Contexto:** `src/lib/data/client.ts` foi alterado pra fazer `auth` (login/cadastro/logout/sessão)
trocar automaticamente entre o mock local (`mock-auth.ts`) e o gateway real, usando o **mesmo
flag** que `db` já usa (`isBackendConfigured`, derivado de `VITE_GATEWAY_URL`):

- **Sem `VITE_GATEWAY_URL`** → `auth` continua 100% mockado (localStorage, senha em texto puro,
  sem TTL de sessão). É o comportamento de sempre, sem mudança.
- **Com `VITE_GATEWAY_URL`** → `auth` para de usar o mock e passa a chamar o gateway em:
  - `POST /auth/sign-in/email` `{ email, password }`
  - `POST /auth/sign-up/email` `{ email, password, name }`
  - `POST /auth/sign-out`
  - `GET  /auth/me` → espera `{ user, role }`

## O que NÃO foi feito (e por quê importa)

**Esses 4 caminhos (`/auth/sign-in/email`, `/auth/sign-up/email`, `/auth/sign-out`, `/auth/me`)
foram escritos a partir do exemplo já documentado no cabeçalho antigo de `mock-auth.ts` e do
contrato geral do `Importantdoc.md` (§B8) — NÃO foram testados contra uma instância real do
`tenant-gateway`.** Eu não tenho acesso a esse repo (`Cerebra-AI/tenant-gateway`) nem a um
ambiente rodando pra confirmar:

1. Se os paths batem exatamente com as rotas que o Better-Auth expõe lá (o Better-Auth tem
   convenções próprias de rota que podem divergir do que documentei aqui).
2. Se `GET /auth/me` realmente devolve `{ user, role }` no formato exato que este app espera
   (`role` sendo um augment específico do gateway em cima da sessão padrão do Better-Auth).
3. Se `signUp`/`signOut` retornam o shape esperado (`{ ok: true }` / `void`).
4. Comportamento de erro (401/403/422) — hoje `api()` só verifica `res.ok` e lança um erro
   genérico com status code; pode não bater com o formato de erro do Better-Auth.

**Antes de apontar `VITE_GATEWAY_URL` pra um gateway real em produção**, teste manualmente (ou
peça pro time do gateway confirmar) os 4 endpoints acima, e ajuste `src/lib/data/client.ts` se
os paths/shapes forem diferentes.

## Sobre segurança de senha

- Este app **nunca** hasheia senha — nem no mock, nem no caminho real. Hashing é responsabilidade
  exclusiva do Better-Auth, rodando no gateway. O front só manda email/senha em texto puro por
  HTTPS (TLS protege o transporte); é assim que o Better-Auth espera receber.
- O mock (`mock-auth.ts`) guarda senha em texto puro no `localStorage` do navegador — isso é
  **só pra demo local**, nunca deve ir pra produção real. Qualquer um com acesso ao DevTools edita
  o `localStorage` e vira admin, contornando todo `roleAtLeast`. Ver comentário
  `⚠️ THE ONLY MOCKED PART OF THE APP ⚠️` no topo do arquivo.

## Checklist antes de considerar isso "pronto pra produção"

- [ ] Confirmar os 4 paths de `/auth/*` com o dono do `tenant-gateway`.
- [ ] Confirmar o shape de `GET /auth/me` (`{ user, role }`).
- [ ] Testar sign-up/sign-in/sign-out ponta a ponta contra um gateway real (não só `db`).
- [ ] Confirmar que erros do Better-Auth (401/422/etc.) chegam de um jeito tratável na UI
      (hoje `api()` lança `Error` genérico com status — pode precisar de tratamento específico).
- [ ] Depois de validado, decidir se `mock-auth.ts` fica no repo (inofensivo, só não é mais usado)
      ou é removido.
