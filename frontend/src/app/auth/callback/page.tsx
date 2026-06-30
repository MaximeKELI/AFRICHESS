"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios, { isAxiosError } from "axios";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { setAccessToken, setRefreshToken } from "@/lib/cookies";
import { API_URL } from "@/lib/apiConfig";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get("code");
    if (!oauthCode) {
      setError(t("auth.callback.incomplete"));
      return;
    }
    setCode(oauthCode);
  }, [t]);

  const exchange = async (oauthCode: string, totp?: string) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post<{ access: string; refresh: string }>(
        `${API_URL}/users/auth/oauth/exchange/`,
        { code: oauthCode, ...(totp ? { totp_code: totp } : {}) }
      );
      if (!data.access || !data.refresh) {
        throw new Error("invalid");
      }
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      window.history.replaceState({}, "", "/auth/callback");
      await fetchProfile();
      router.replace("/play");
    } catch (err) {
      if (
        isAxiosError(err) &&
        (err.response?.data?.code === "TOTP_REQUIRED" ||
          err.response?.data?.error === "TOTP_REQUIRED")
      ) {
        setNeedsTotp(true);
        return;
      }
      setError(t("auth.callback.profileError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code || needsTotp) return;
    void exchange(code);
  }, [code, needsTotp]);

  const submitTotp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !totpCode.trim()) return;
    void exchange(code, totpCode.trim());
  };

  if (needsTotp) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <h1 className="font-display text-xl font-bold mb-4">{t("security.2fa.title")}</h1>
        <form onSubmit={submitTotp} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder={t("auth.login.totpLabel")}
            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10"
          />
          <button
            type="submit"
            disabled={loading || !totpCode.trim()}
            className="w-full py-3 african-gradient text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("auth.login.submit")}
          </button>
        </form>
        {error && <p className="mt-4 text-africhess-terracotta text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {error ? (
        <p className="text-africhess-terracotta">{error}</p>
      ) : (
        <p className="opacity-70">{t("auth.callback.loading")}</p>
      )}
    </div>
  );
}
