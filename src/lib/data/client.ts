// =============================================================================
// client.ts — THE SINGLE INTEGRATION SEAM between this SPA and the backend.
// -----------------------------------------------------------------------------
// Two surfaces live here:
//
//   • `db`   → REAL backend. Every business table (companies, contacts, deals,
//              activities, pipelines, …) is read/written through the generic
//              gateway CRUD API: GET/POST/PATCH/DELETE /data/:table. The whole
//              app depends only on this shape — no table-specific endpoints.
//
//   • `auth` → MOCKED for now (see mock-auth.ts). It is the ONLY faked piece.
//              Login/session are simulated so you can enter the app before a
//              real auth backend exists.
//
// ── HOW TO CONNECT A REAL BACKEND ────────────────────────────────────────────
//   1. Data: set `VITE_GATEWAY_URL` (env var) to your tenant-gateway base URL.
//      `db` immediately starts hitting it — no code change. Until it is set,
//      `db` calls throw `BackendNotConfiguredError` and the UI shows a banner
//      (see BackendNotice / AppLayout) instead of pretending to have data.
//   2. Auth: replace the four `auth` methods below (they delegate to the mock)
//      with `api(...)` calls to your gateway's `/auth/*` endpoints, exactly like
//      `db` does. Then delete mock-auth.ts. Nothing else in the app changes.
//
// This file is the contract. Keep the `db` / `auth` shapes stable so the rest
// of the app (repos, hooks, screens) stays backend-agnostic.
// =============================================================================
import { mockAuth } from "./mock-auth";

export type { Role, Me } from "./mock-auth";

const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const GW =
  params.get("gw") ||
  import.meta.env.VITE_GATEWAY_URL ||
  (typeof window !== "undefined" ? (window as unknown as { __MASI_GW__?: string }).__MASI_GW__ : "") ||
  "";
const TENANT =
  params.get("t") ||
  (typeof window !== "undefined" ? (window as unknown as { __MASI_TENANT__?: string }).__MASI_TENANT__ : "") ||
  "";

// True once a gateway URL is configured. The UI uses this to show/hide the
// "backend not connected" notice — see BackendNotice in the layout.
export const isBackendConfigured = Boolean(GW);

// Thrown when `db` is used with no gateway configured. Surfaced to the user as
// a banner (reads state) or a toast (mutations catch it) — never silent.
export class BackendNotConfiguredError extends Error {
  constructor() {
    super(
      "Backend não conectado: defina VITE_GATEWAY_URL para apontar ao tenant-gateway. " +
        "(O login está em modo mock; os dados não são simulados.)",
    );
    this.name = "BackendNotConfiguredError";
  }
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!GW) throw new BackendNotConfiguredError();

  const res = await fetch(`${GW}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Tenant-Id": TENANT },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// Generic data access — the real backend. owner_id / tenant scoping is applied
// server-side by the gateway; never send owner_id from the front.
export const db = {
  table<R = unknown>(name: string) {
    return {
      list: () => api<R[]>("GET", `/data/${name}`),
      create: (input: Partial<R>) => api<R>("POST", `/data/${name}`, input),
      update: (id: string, patch: Partial<R>) => api<R>("PATCH", `/data/${name}/${id}`, patch),
      remove: (id: string) => api<void>("DELETE", `/data/${name}/${id}`),
    };
  },
};

// Auth — MOCKED (mock-auth.ts). To integrate real auth, swap each line below for
// an `api(...)` call to your gateway's /auth/* endpoint, then delete mock-auth.ts.
export const auth = {
  signIn: (email: string, password: string) => mockAuth.signIn(email, password),
  signUp: (email: string, password: string, name?: string) => mockAuth.signUp(email, password, name),
  signOut: () => mockAuth.signOut(),
  me: () => mockAuth.me(),
};
