/**
 * Store in-memory para desenvolvimento local (VITE_PREVIEW_MODE=true).
 * Simula o tenant-gateway + Better-Auth sem backend externo.
 */

type Row = Record<string, unknown> & { id: string };

type Role = "admin" | "manager" | "rep";
type PreviewUser = { id: string; email: string; name?: string } | null;

export const PREVIEW_USER_ID = "usr_preview_demo";

const OWNER_TABLES = new Set([
  "companies",
  "contacts",
  "deals",
  "activities",
  "contact_tags",
  "deal_tags",
  "sales_goals",
  "segments",
]);

const stores = new Map<string, Row[]>();

let sessionUser: PreviewUser = {
  id: PREVIEW_USER_ID,
  email: "demo@flowcrm.local",
  name: "Demo User",
};
let sessionRole: Role = "admin";

function ts() {
  return new Date().toISOString();
}

function table(name: string): Row[] {
  if (!stores.has(name)) stores.set(name, []);
  return stores.get(name)!;
}

function seed() {
  const now = ts();

  const pipelineId = "11111111-1111-1111-1111-111111111111";
  const stageLead = "22222222-2222-2222-2222-222222222221";
  const stageQual = "22222222-2222-2222-2222-222222222222";
  const stageProp = "22222222-2222-2222-2222-222222222223";
  const stageNeg = "22222222-2222-2222-2222-222222222224";
  const stageWon = "22222222-2222-2222-2222-222222222225";
  const companyId = "33333333-3333-3333-3333-333333333331";
  const contactId = "44444444-4444-4444-4444-444444444441";
  const dealId = "55555555-5555-5555-5555-555555555551";
  const tagId = "66666666-6666-6666-6666-666666666661";

  stores.set("pipelines", [
    {
      id: pipelineId,
      name: "Pipeline de Vendas",
      currency: "BRL",
      is_default: true,
      created_at: now,
      updated_at: now,
    },
  ]);

  stores.set("pipeline_stages", [
    { id: stageLead, pipeline_id: pipelineId, name: "Lead", sort_order: 0, color: "#94a3b8", win_probability: 10, created_at: now },
    { id: stageQual, pipeline_id: pipelineId, name: "Qualificado", sort_order: 1, color: "#3b82f6", win_probability: 25, created_at: now },
    { id: stageProp, pipeline_id: pipelineId, name: "Proposta", sort_order: 2, color: "#f59e0b", win_probability: 50, created_at: now },
    { id: stageNeg, pipeline_id: pipelineId, name: "Negociação", sort_order: 3, color: "#8b5cf6", win_probability: 75, created_at: now },
    { id: stageWon, pipeline_id: pipelineId, name: "Fechado", sort_order: 4, color: "#22c55e", win_probability: 100, created_at: now },
  ]);

  stores.set("tags", [
    { id: tagId, name: "VIP", color: "#8b5cf6", created_at: now },
  ]);

  stores.set("loss_reasons", [
    { id: "77777777-7777-7777-7777-777777777771", label: "Preço", is_active: true, usage_count: 0, created_at: now },
    { id: "77777777-7777-7777-7777-777777777772", label: "Concorrência", is_active: true, usage_count: 0, created_at: now },
  ]);

  stores.set("companies", [
    {
      id: companyId,
      owner_id: PREVIEW_USER_ID,
      name: "Acme Tecnologia",
      domain: "acme.com.br",
      industry: "Tecnologia",
      size: "51-200",
      revenue: 2500000,
      website: "https://acme.com.br",
      linkedin_url: null,
      created_at: now,
      updated_at: now,
    },
  ]);

  stores.set("contacts", [
    {
      id: contactId,
      owner_id: PREVIEW_USER_ID,
      company_id: companyId,
      first_name: "Maria",
      last_name: "Silva",
      email: "maria@acme.com.br",
      phone: "+55 11 99999-0001",
      title: "Diretora Comercial",
      linkedin_url: null,
      avatar_url: null,
      status: "prospect",
      lead_score: 72,
      created_at: now,
      updated_at: now,
    },
    {
      id: "44444444-4444-4444-4444-444444444442",
      owner_id: PREVIEW_USER_ID,
      company_id: companyId,
      first_name: "João",
      last_name: "Santos",
      email: "joao@acme.com.br",
      phone: "+55 11 99999-0002",
      title: "CEO",
      linkedin_url: null,
      avatar_url: null,
      status: "lead",
      lead_score: 45,
      created_at: now,
      updated_at: now,
    },
  ]);

  stores.set("deals", [
    {
      id: dealId,
      owner_id: PREVIEW_USER_ID,
      title: "Licença Enterprise — Acme",
      value: 120000,
      currency: "BRL",
      stage_id: stageProp,
      contact_id: contactId,
      company_id: companyId,
      close_date: null,
      probability: 50,
      status: "open",
      loss_reason: null,
      qualification: {
        budget: true,
        authority: true,
        need: true,
        timeline: false,
        budget_notes: "",
        authority_notes: "",
        need_notes: "",
        timeline_notes: "",
      },
      qualification_score: 75,
      created_at: now,
      updated_at: now,
    },
  ]);

  stores.set("activities", [
    {
      id: "99999999-9999-9999-9999-999999999991",
      owner_id: PREVIEW_USER_ID,
      type: "call",
      title: "Discovery call",
      body: "Entender necessidades do time comercial",
      contact_id: contactId,
      deal_id: dealId,
      company_id: companyId,
      due_date: now,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "99999999-9999-9999-9999-999999999992",
      owner_id: PREVIEW_USER_ID,
      type: "task",
      title: "Enviar proposta revisada",
      body: null,
      contact_id: contactId,
      deal_id: dealId,
      company_id: companyId,
      due_date: now,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
  ]);

  stores.set("sales_goals", [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      owner_id: PREVIEW_USER_ID,
      goal_type: "revenue",
      target_value: 500000,
      current_value: 120000,
      period_month: 6,
      period_year: 2026,
      created_at: now,
      updated_at: now,
    },
  ]);

  stores.set("segments", []);
  stores.set("contact_tags", []);
  stores.set("deal_tags", []);
}

let seeded = false;
function ensureSeeded() {
  if (!seeded) {
    seed();
    seeded = true;
  }
}

export function isPreviewMode(env: ImportMetaEnv): boolean {
  if (env.VITE_PREVIEW_MODE === "false") return false;
  if (env.VITE_PREVIEW_MODE === "true") return true;
  return !env.VITE_GATEWAY_URL;
}

export async function previewApi<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  ensureSeeded();
  await delay(80);

  if (path === "/auth/me") {
    return { user: sessionUser, role: sessionRole } as T;
  }
  if (path === "/auth/sign-out") {
    sessionUser = null;
    sessionRole = null;
    return undefined as T;
  }
  if (path === "/auth/sign-in/email" && body && typeof body === "object") {
    const { email } = body as { email?: string; password?: string };
    sessionUser = {
      id: PREVIEW_USER_ID,
      email: email || "demo@flowcrm.local",
      name: "Demo User",
    };
    sessionRole = "admin";
    return { ok: true } as T;
  }
  if (path === "/auth/sign-up/email" && body && typeof body === "object") {
    const { email, name } = body as { email?: string; password?: string; name?: string };
    sessionUser = {
      id: PREVIEW_USER_ID,
      email: email || "demo@flowcrm.local",
      name: name || "Demo User",
    };
    sessionRole = "admin";
    return { ok: true } as T;
  }

  const match = path.match(/^\/data\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) throw new Error(`Preview: rota desconhecida ${path}`);

  const [, tableName, rowId] = match;
  const rows = table(tableName);

  if (method === "GET" && !rowId) return [...rows] as T;

  if (method === "POST" && !rowId) {
    const input = (body ?? {}) as Record<string, unknown>;
    const row: Row = {
      id: crypto.randomUUID(),
      ...input,
      created_at: input.created_at ?? ts(),
      updated_at: input.updated_at ?? ts(),
    };
    if (OWNER_TABLES.has(tableName)) {
      row.owner_id = PREVIEW_USER_ID;
    }
    rows.push(row);
    return row as T;
  }

  if (method === "PATCH" && rowId) {
    const idx = rows.findIndex((r) => r.id === rowId);
    if (idx === -1) throw new Error(`404 ${tableName}/${rowId}`);
    rows[idx] = { ...rows[idx], ...(body as Record<string, unknown>), updated_at: ts() };
    return rows[idx] as T;
  }

  if (method === "DELETE" && rowId) {
    const idx = rows.findIndex((r) => r.id === rowId);
    if (idx === -1) throw new Error(`404 ${tableName}/${rowId}`);
    rows.splice(idx, 1);
    return undefined as T;
  }

  throw new Error(`Preview: ${method} ${path} não suportado`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
