"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { setAccessToken, setRefreshToken } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const { t } = useTranslation();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setError(t("auth.callback.incomplete"));
      return;
    }
    axios
      .post<{ access: string; refresh: string }>(
        `${API_URL}/users/auth/oauth/exchange/`,
        { code }
      )
      .then(({ data }) => {
        if (!data.access || !data.refresh) {
          throw new Error("invalid");
        }
        setAccessToken(data.access);
        setRefreshToken(data.refresh);
        window.history.replaceState({}, "", "/auth/callback");
        return fetchProfile();
      })
      .then(() => router.replace("/play"))
      .catch(() => setError(t("auth.callback.profileError")));
  }, [fetchProfile, router, t]);

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
