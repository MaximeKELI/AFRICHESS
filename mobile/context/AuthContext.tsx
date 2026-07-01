import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import { LoginError, authApi } from "../lib/api";
import { oauthLoginUrl, oauthRedirectUri, parseOAuthCode } from "../lib/oauth";
import { clearTokens, getAccessToken, setTokens } from "../lib/storage";

interface User {
  id: number;
  username: string;
  display_name?: string;
  is_premium?: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, totpCode?: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "github") => Promise<void>;
  completeOAuth: (code: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { data } = await authApi.profile();
      setUser(data);
    } catch {
      setUser(null);
      await clearTokens();
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const completeOAuth = useCallback(
    async (code: string, totpCode?: string) => {
      try {
        const { data } = await authApi.oauthExchange(code, totpCode);
        await setTokens(data.access, data.refresh);
        await refreshProfile();
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const body = err.response?.data as { code?: string; error?: string } | undefined;
          if (body?.code === "TOTP_REQUIRED" || body?.error === "TOTP_REQUIRED") {
            throw new LoginError("TOTP_REQUIRED", "TOTP_REQUIRED", code);
          }
        }
        throw err;
      }
    },
    [refreshProfile]
  );

  const loginWithOAuth = useCallback(
    async (provider: "google" | "github") => {
      const url = oauthLoginUrl(provider);
      const redirect = oauthRedirectUri();
      const result = await WebBrowser.openAuthSessionAsync(url, redirect);
      if (result.type !== "success" || !result.url) {
        throw new LoginError("OAuth annulé");
      }
      const code = parseOAuthCode(result.url);
      if (!code) {
        throw new LoginError("Code OAuth manquant");
      }
      await completeOAuth(code);
    },
    [completeOAuth]
  );

  const login = useCallback(
    async (username: string, password: string, totpCode?: string) => {
      try {
        const { data } = await authApi.login(username, password, totpCode);
        await setTokens(data.access, data.refresh);
        await refreshProfile();
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const body = err.response?.data as { non_field_errors?: string[] } | undefined;
          const msg = body?.non_field_errors?.[0] ?? "";
          if (msg.includes("TOTP_REQUIRED")) {
            throw new LoginError("TOTP_REQUIRED", "TOTP_REQUIRED");
          }
        }
        throw err;
      }
    },
    [refreshProfile]
  );

  const logout = useCallback(async () => {
    const { unregisterPushToken } = await import("../hooks/usePushNotifications");
    await unregisterPushToken().catch(() => {});
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginWithOAuth, completeOAuth, logout, refreshProfile }),
    [user, loading, login, loginWithOAuth, completeOAuth, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export { LoginError };
