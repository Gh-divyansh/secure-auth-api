import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type User } from "../api/client";
import { tokenStorage } from "./tokenStorage";

type AuthContextValue = { user: User | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; deleteAccount: () => Promise<void>; refreshUser: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const clear = useCallback(() => { tokenStorage.clear(); setUser(null); }, []);
  const refreshUser = useCallback(async () => { const { user } = await api.getMe(); setUser(user); }, []);

  useEffect(() => {
    api.setAuthenticationFailureHandler(clear);
    if (!tokenStorage.get()) { setReady(true); return; }
    refreshUser().catch(clear).finally(() => setReady(true));
    return () => api.setAuthenticationFailureHandler(() => {});
  }, [clear, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    tokenStorage.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    await refreshUser();
  }, [refreshUser]);
  const logout = useCallback(async () => {
    const tokens = tokenStorage.get();
    try { if (tokens?.refreshToken) await api.logout(tokens.refreshToken); } finally { clear(); }
  }, [clear]);
  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    clear();
  }, [clear]);
  const value = useMemo(() => ({ user, ready, login, logout, deleteAccount, refreshUser }), [user, ready, login, logout, deleteAccount, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
