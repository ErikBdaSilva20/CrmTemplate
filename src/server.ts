// =============================================================================
// server.ts — MOCK GATEWAY, 100% LOCALHOST ONLY.
// -----------------------------------------------------------------------------
// Stands in for the real tenant-gateway so `db` (src/lib/data/client.ts) has
// something to talk to during local dev. Implements only the generic CRUD
// contract the front already expects: GET/POST/PATCH/DELETE /data/:table.
//
// NOT involved in auth — login stays 100% mocked client-side in mock-auth.ts
// (localStorage). This server never receives credentials and has no session
// concept; every write is attributed to a single local stub user (see
// resolveOwner below). Do not point VITE_GATEWAY_URL at this in anything but
// local dev — it has zero auth, zero tenant isolation.
//
// Run: `pnpm dev:server` (or `pnpm dev` to run it + the SPA together).
// =============================================================================
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Pool } from "pg";

const app = new Hono();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://masia:masia_dev@localhost:5432/tenant_local",
});

// Tabelas cujo owner_id é injetado pelo server (rep cria/edita) — espelha
// TABLES_WITH_OWNER da migration (supabase/migrations/0001_business_schema.sql §B4.1).
const TABLES_WITH_OWNER = new Set([
  "companies", "contacts", "deals", "activities",
  "contact_tags", "deal_tags", "sales_goals",
]);

// Lookups com ordenação natural.
const LOOKUP_ORDER: Record<string, string> = {
  pipeline_stages: "sort_order",
};

// CORS — reflete a origin (funciona em qualquer porta do Vite dev).
app.use("*", async (c, next) => {
  const origin = c.req.header("origin") || "http://localhost:5174";
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,X-Tenant-Id");
  if (c.req.method === "OPTIONS") return c.text("OK");
  await next();
});

// Sem sessão real (auth é mock no front): todo write local usa o mesmo usuário
// stub, criando-o na primeira chamada se a tabela "user" estiver vazia.
async function resolveOwner(): Promise<string> {
  const existing = await pool.query(`SELECT id FROM "user" LIMIT 1`);
  if (existing.rows[0]?.id) return existing.rows[0].id;
  const created = await pool.query(
    `INSERT INTO "user" (id, email, name) VALUES ($1, $2, $3) RETURNING id`,
    [`usr_local_${Date.now()}`, "admin@demo.local", "Admin Local"],
  );
  return created.rows[0].id;
}

// Sem tela mesmo: isto é só a API do gateway (CRUD genérico), não o app. Uma
// rota "/" amigável evita que abrir http://localhost:8080 direto no navegador
// pareça um servidor quebrado (404 puro do Hono).
app.get("/", (c) =>
  c.json({
    status: "ok",
    message: "Mock gateway (100% local) — só API, sem tela. O app roda em http://localhost:5174.",
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

// ── CRUD genérico (plano, sem get-by-id — Importantdoc §B5) ─────────────────
app.get("/data/:table", async (c) => {
  const table = c.req.param("table");
  try {
    const order = TABLES_WITH_OWNER.has(table)
      ? "ORDER BY created_at DESC"
      : LOOKUP_ORDER[table]
        ? `ORDER BY ${LOOKUP_ORDER[table]} ASC`
        : "";
    const r = await pool.query(`SELECT * FROM ${table} ${order}`);
    return c.json(r.rows);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post("/data/:table", async (c) => {
  const table = c.req.param("table");
  const body = await c.req.json();
  if (TABLES_WITH_OWNER.has(table)) {
    body.owner_id = await resolveOwner();
  }
  try {
    const cols = Object.keys(body);
    const vals = Object.values(body);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const r = await pool.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      vals,
    );
    return c.json(r.rows[0]);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.patch("/data/:table/:id", async (c) => {
  const table = c.req.param("table");
  const id = c.req.param("id");
  const body = await c.req.json();
  delete body.owner_id; // nunca aceito do front — regra do contrato (§B5)
  delete body.id;
  try {
    const cols = Object.keys(body);
    const vals = Object.values(body);
    const set = cols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const touch = TABLES_WITH_OWNER.has(table) ? ", updated_at = NOW()" : "";
    const r = await pool.query(
      `UPDATE ${table} SET ${set}${touch} WHERE id = $${cols.length + 1} RETURNING *`,
      [...vals, id],
    );
    if (!r.rows.length) return c.json({ error: "Not found" }, 404);
    return c.json(r.rows[0]);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.delete("/data/:table/:id", async (c) => {
  const table = c.req.param("table");
  const id = c.req.param("id");
  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return c.body(null, 204);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

const port = Number(process.env.GATEWAY_PORT) || 3000;
console.log(`Mock gateway (100% local) em http://localhost:${port}`);
serve({ fetch: app.fetch, port });
