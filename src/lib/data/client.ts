import { isPreviewMode, previewApi } from "../../../preview-fixtures";

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

const usePreview = isPreviewMode(import.meta.env);

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (usePreview) {
    return previewApi<T>(method, path, body);
  }

  const res = await fetch(`${GW}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Tenant-Id": TENANT },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

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

export type Role = "admin" | "manager" | "rep";
export interface Me {
  user: { id: string; email: string; name?: string } | null;
  role: Role | null;
}

export const auth = {
  signIn: (email: string, password: string) =>
    api<{ ok: true }>("POST", "/auth/sign-in/email", { email, password }),
  signUp: (email: string, password: string, name?: string) =>
    api<{ ok: true }>("POST", "/auth/sign-up/email", { email, password, name }),
  signOut: () => api<void>("POST", "/auth/sign-out"),
  me: () => api<Me>("GET", "/auth/me"),
};
