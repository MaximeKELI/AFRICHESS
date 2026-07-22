"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { consumeReturnAfterLogin } from "@/lib/session";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { LoadingState } from "@/components/ui/LoadingState";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setError(t("auth.login.expired"));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password, needsTotp ? totpCode : undefined);
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(safeNext ?? consumeReturnAfterLogin() ?? "/play");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      if (message === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setError(t("auth.login.totpHint"));
        return;
      }
      setError(message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold mb-8 text-center">{t("auth.login.title")}</h1>
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
        <div>
          <label htmlFor="login-username" className="block text-sm font-medium mb-1.5">
            {t("auth.login.username")}
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-white/20 bg-transparent focus:border-africhess-gold focus:outline-none focus:ring-1 focus:ring-africhess-gold/40"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium mb-1.5">
            {t("auth.login.password")}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-white/20 bg-transparent focus:border-africhess-gold focus:outline-none focus:ring-1 focus:ring-africhess-gold/40"
            required
          />
        </div>
        {needsTotp && (
          <div>
            <label htmlFor="login-totp" className="block text-sm font-medium mb-1.5">
              {t("auth.login.totpLabel")}
            </label>
            <input
              id="login-totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-4 py-3 rounded-lg border border-white/20 bg-transparent tracking-widest focus:border-africhess-gold focus:outline-none focus:ring-1 focus:ring-africhess-gold/40"
              required
              maxLength={6}
            />
          </div>
        )}
        {username.includes("@") && (
          <p className="text-xs text-africhess-gold/90 -mt-2">{t("auth.login.emailWarning")}</p>
        )}
        {error && (
          <p className="text-africhess-terracotta text-sm" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          data-testid="login-submit"
          className="w-full py-3 african-gradient text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
        <OAuthButtons />
        <p className="text-center text-xs opacity-70">{t("auth.login.hint")}</p>
        <p className="text-center text-sm">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="text-africhess-gold underline">
            {t("auth.login.signup")}
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState className="py-16" />}>
      <LoginContent />
    </Suspense>
  );
}
