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
//   • `auth` → auto-switches on `isBackendConfigured` (same flag `db` uses):
//              no `VITE_GATEWAY_URL` → falls back to the mock (mock-auth.ts);
//              `VITE_GATEWAY_URL` set → calls the gateway's Better-Auth
//              `/auth/*` endpoints for real. See `doc/ALERTA-AUTH-GATEWAY.md`
//              for the security notes on this switch (endpoint paths assumed,
//              not yet verified against a live tenant-gateway).
//
// ── HOW TO CONNECT A REAL BACKEND ────────────────────────────────────────────
//   1. Data: set `VITE_GATEWAY_URL` (env var) to your tenant-gateway base URL.
//      `db` immediately starts hitting it — no code change. Until it is set,
//      `db` calls throw `BackendNotConfiguredError` and the UI shows a banner
//      (see BackendNotice / AppLayout) instead of pretending to have data.
//   2. Auth: setting `VITE_GATEWAY_URL` is ALSO enough for `auth` — it stops
//      calling the mock and starts hitting `/auth/*` on the same gateway.
//      Nothing else in the app changes. mock-auth.ts can stay in the repo
//      (it's simply unused once a gateway is configured) or be deleted.
//
// This file is the contract. Keep the `db` / `auth` shapes stable so the rest
// of the app (repos, hooks, screens) stays backend-agnostic.
// =============================================================================
import { mockAuth } from "./mock-auth";
import type { Me } from "./mock-auth";

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

// Auth — real gateway (Better-Auth) when `isBackendConfigured`, mock-auth.ts
// otherwise. Password hashing/session issuing happens server-side in
// Better-Auth; this file only ever sends email/password over HTTPS, never
// hashes anything itself (Importantdoc §B3: "NUNCA implemente auth próprio").
export const auth = {
  signIn: (email: string, password: string) =>
    isBackendConfigured
      ? api<{ ok: true }>("POST", "/auth/sign-in/email", { email, password })
      : mockAuth.signIn(email, password),

  signUp: (email: string, password: string, name?: string) =>
    isBackendConfigured
      ? api<{ ok: true }>("POST", "/auth/sign-up/email", { email, password, name })
      : mockAuth.signUp(email, password, name),

  signOut: () =>
    isBackendConfigured ? api<void>("POST", "/auth/sign-out") : mockAuth.signOut(),

  me: () => (isBackendConfigured ? api<Me>("GET", "/auth/me") : mockAuth.me()),
};
