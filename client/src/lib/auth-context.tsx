import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "passwordHash">;

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
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
  login: async () => { throw new Error("AuthProvider not mounted"); },
  register: async () => { throw new Error("AuthProvider not mounted"); },
  logout: () => {},
  updateProfile: async () => { throw new Error("AuthProvider not mounted"); },
  setAuthState: () => {},
});

// Store token in module scope so apiRequest can access it
let currentToken: string | null = null;

export function getAuthToken(): string | null {
  return currentToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const setAuthState = useCallback((u: SafeUser, t: string) => {
    setUser(u);
    setToken(t);
    currentToken = t;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<SafeUser> => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    currentToken = data.token;
    return data.user;
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; phone?: string }): Promise<SafeUser> => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    setUser(result.user);
    setToken(result.token);
    currentToken = result.token;
    return result.user;
  }, []);

  const logout = useCallback(() => {
    if (token) {
      // Fire and forget
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    currentToken = null;
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
