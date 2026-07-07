// =============================================================================
// mock-auth.ts — ⚠️ THE ONLY MOCKED PART OF THE APP ⚠️
// -----------------------------------------------------------------------------
// Everything else (all business data) talks to the REAL backend through the
// `db` object in client.ts (`GET/POST/PATCH/DELETE /data/:table`). Only login /
// session is faked here, so you can get into the app and demo the UI before a
// real auth backend (Better-Auth on the tenant-gateway) exists.
//
// ── HOW TO REPLACE WITH REAL AUTH (for the integrating dev) ──────────────────
// You do NOT need to touch this file OR client.ts to integrate — `auth` in
// client.ts already auto-switches on `isBackendConfigured`: set
// `VITE_GATEWAY_URL` and it starts hitting the gateway's `/auth/*` endpoints
// instead of this mock. See `doc/ALERTA-AUTH-GATEWAY.md` before relying on
// this in anything beyond local testing — the endpoint paths were written
// from the documented contract, not verified against a live tenant-gateway.
//
// Once verified, this file can stay (unused once a gateway is configured) or
// be deleted. The rest of the app (screens, repos, hooks) is already
// auth-agnostic and needs no changes either way.
//
// ── WHAT THIS MOCK DOES ──────────────────────────────────────────────────────
//   • Persists a small user store + the active session in localStorage, so a
//     login survives a page refresh (F5) and feels like a real backend.
//   • Falls back to an in-memory store when localStorage is unavailable
//     (SSR / unit tests), so imports never crash.
//   • First user created becomes `admin`; everyone after is `rep` — mirrors the
//     real gateway rule ("1º usuário do tenant vira admin"), Importantdoc §B8.
//   • Seeds one demo admin on first run so you can log in out of the box.
// =============================================================================

export type Role = 'admin' | 'manager' | 'rep';

export interface Me {
  user: { id: string; email: string; name?: string } | null;
  role: Role | null;
}

// Default admin seeded on first run — documented demo credentials.
const DEMO_EMAIL = 'admin@demo.local';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Admin Demo';

interface StoredUser {
  id: string;
  email: string;
  name?: string;
  password: string; // plaintext — MOCK ONLY, never do this against a real backend
  role: Role;
}

const USERS_KEY = 'cellrm.mock.users';
const SESSION_KEY = 'cellrm.mock.session'; // holds the logged-in user id

// ── Storage layer: localStorage when present, in-memory otherwise ────────────
const memoryStore = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readRaw(key: string): string | null {
  return hasLocalStorage() ? window.localStorage.getItem(key) : (memoryStore.get(key) ?? null);
}

function writeRaw(key: string, value: string): void {
  if (hasLocalStorage()) window.localStorage.setItem(key, value);
  else memoryStore.set(key, value);
}

function removeRaw(key: string): void {
  if (hasLocalStorage()) window.localStorage.removeItem(key);
  else memoryStore.delete(key);
}

function loadUsers(): StoredUser[] {
  const raw = readRaw(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  writeRaw(USERS_KEY, JSON.stringify(users));
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `usr_${crypto.randomUUID()}`
    : `usr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// Seed the demo admin the first time the mock runs on a device.
function ensureSeeded(): void {
  if (loadUsers().length > 0) return;
  saveUsers([
    { id: newId(), email: DEMO_EMAIL, name: DEMO_NAME, password: DEMO_PASSWORD, role: 'admin' },
  ]);
}

function toMe(user: StoredUser | null): Me {
  if (!user) return { user: null, role: null };
  return { user: { id: user.id, email: user.email, name: user.name }, role: user.role };
}

// ── Public mock auth API — mirrors the real gateway `auth` contract exactly ──
export const mockAuth = {
  async signIn(email: string, password: string): Promise<{ ok: true }> {
    ensureSeeded();
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      throw new Error('Email ou senha inválidos');
    }
    writeRaw(SESSION_KEY, user.id);
    return { ok: true };
  },

  async signUp(email: string, password: string, name?: string): Promise<{ ok: true }> {
    ensureSeeded();
    const normalizedEmail = email.trim().toLowerCase();
    const users = loadUsers();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('Já existe uma conta com este email');
    }
    // First user overall is admin; everyone else is rep (mirrors the gateway).
    const role: Role = users.length === 0 ? 'admin' : 'rep';
    const user: StoredUser = { id: newId(), email: email.trim(), name, password, role };
    saveUsers([...users, user]);
    writeRaw(SESSION_KEY, user.id);
    return { ok: true };
  },

  async signOut(): Promise<void> {
    removeRaw(SESSION_KEY);
  },

  async me(): Promise<Me> {
    ensureSeeded();
    const sessionId = readRaw(SESSION_KEY);
    if (!sessionId) return { user: null, role: null };
    const user = loadUsers().find((u) => u.id === sessionId) ?? null;
    return toMe(user);
  },
};
