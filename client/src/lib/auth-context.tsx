import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "passwordHash">;

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<SafeUser>;
  register: (data: { email: string; password: string; name: string; phone?: string }) => Promise<SafeUser>;
  logout: () => void;
  updateProfile: (updates: Partial<SafeUser>) => Promise<SafeUser>;
  setAuthState: (user: SafeUser, token: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  register: async () => { throw new Error("AuthProvider not mounted"); },
  logout: () => {},
  updateProfile: async () => { throw new Error("AuthProvider not mounted"); },
  setAuthState: () => {},
});

const TOKEN_KEY = "wedda_auth_token";

// Module-scope token so apiRequest can read it without React context
let currentToken: string | null = localStorage.getItem(TOKEN_KEY);

export function getAuthToken(): string | null {
  return currentToken;
}

function persistToken(t: string | null) {
  currentToken = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore session from stored token
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    currentToken = stored;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (u) {
          setUser(u);
          setToken(stored);
        } else {
          persistToken(null);
          setToken(null);
        }
      })
      .catch(() => {
        persistToken(null);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setAuthState = useCallback((u: SafeUser, t: string) => {
    setUser(u);
    setToken(t);
    persistToken(t);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<SafeUser> => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    persistToken(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; phone?: string }): Promise<SafeUser> => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    setUser(result.user);
    setToken(result.token);
    persistToken(result.token);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    persistToken(null);
  }, [token]);

  const updateProfile = useCallback(async (updates: Partial<SafeUser>): Promise<SafeUser> => {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update profile");
    }
    const updated = await res.json();
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      setAuthState,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
