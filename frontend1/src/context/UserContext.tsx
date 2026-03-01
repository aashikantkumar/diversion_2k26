import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import api, { tokenStore } from "../lib/api";
import type { User } from "../types";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  primaryNeuro: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (opts: { email: string; password: string; name?: string; role: "teacher" | "student" }) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null, loading: true, error: null, isAuthenticated: false,
  isTeacher: false, isStudent: false, primaryNeuro: null,
  login: async () => { throw new Error("not ready"); },
  register: async () => { throw new Error("not ready"); },
  logout: async () => {},
  refetchUser: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────
  function applyAuthResponse(data: AuthResponse) {
    tokenStore.setAccess(data.accessToken);
    tokenStore.setRefresh(data.refreshToken);
    setUser(data.user);
    setError(null);
  }

  // ── Boot: restore session from stored refresh token ────────
  useEffect(() => {
    const restore = async () => {
      const storedRefresh = tokenStore.getRefresh();
      if (!storedRefresh) { setLoading(false); return; }
      try {
        const { data } = await api.post<AuthResponse>("/api/auth/refresh", { refreshToken: storedRefresh });
        applyAuthResponse(data);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // ── Listen for token-failed events dispatched by api.ts ────
  // Clear user state and redirect to /login so they can re-authenticate
  useEffect(() => {
    const handler = () => {
      setUser(null);
      tokenStore.clear();
      // Only redirect if not already on a public page
      const pub = ["/", "/login", "/register"];
      if (!pub.includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
      applyAuthResponse(data);
      return data.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, name, role }: {
    email: string; password: string; name?: string; role: "teacher" | "student";
  }): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<AuthResponse>("/api/auth/register", { email, password, name, role });
      applyAuthResponse(data);
      return data.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenStore.getRefresh();
      if (refreshToken) await api.post("/api/auth/logout", { refreshToken }).catch(() => {});
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const refetchUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: User }>("/api/auth/me");
      setUser(data.user);
    } catch {
      // silently ignore
    }
  }, []);

  const isAuthenticated = !!user;
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "individual" || user?.role === "org_student";
  const primaryNeuro = user?.neurodiversity?.find((n) => n !== "none") ?? null;

  return (
    <UserContext.Provider value={{
      user, loading, error, isAuthenticated,
      isTeacher, isStudent, primaryNeuro,
      login, register, logout, refetchUser,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
