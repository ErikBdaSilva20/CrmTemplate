// =============================================================================
// ⚠️ PLACEHOLDER — no template real, `auth.tsx` é herdado do scaffold `wiki`
// (Importantdoc §B-Receita passo 7: "Reaproveite LoginScreen/AppShell/auth.tsx/
// RequireAuth — não mexa nesses"). Este arquivo existe só pra as telas portadas
// COMPILAREM e plugarem antes do scaffold chegar; na integração, use o do scaffold.
//
// Contrato (§B8):
//   • Login/cadastro via Better-Auth (auth.signIn/signUp/signOut do client.ts).
//   • auth.me() → { user, role }. Papéis: admin | manager | rep (+ owner = criador).
//   • 1º usuário do tenant vira admin; demais entram como rep (automático no gateway).
//   • `role` é usado SÓ pra UI (esconder botões). A segurança real é no gateway.
// =============================================================================
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { auth, type Me, type Role } from "./data/client";

interface AuthState {
  user: Me["user"];
  role: Role | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me["user"]>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await auth.me();
      setUser(me.user);
      setRole(me.role);
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Gate de rota — substitui o redirect do AppLayout do FlowCRM.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Helper de UI: hierarquia admin > manager > rep (owner conta como admin pra UI).
const RANK: Record<string, number> = { admin: 3, owner: 3, manager: 2, rep: 1 };
export function roleAtLeast(role: Role | null, min: Role): boolean {
  return (RANK[role ?? ""] ?? 0) >= (RANK[min] ?? 99);
}
