"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const { t } = useTranslation();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (!access || !refresh) {
      setError(t("auth.callback.incomplete"));
      return;
    }
    Cookies.set("access_token", access, { expires: 1 });
    Cookies.set("refresh_token", refresh, { expires: 7 });
    fetchProfile()
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
