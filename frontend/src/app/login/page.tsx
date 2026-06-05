"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      await login(username, password);
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold mb-8 text-center">{t("auth.login.title")}</h1>
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
        <input
          type="text"
          placeholder={t("auth.login.username")}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
        />
        <input
          type="password"
          placeholder={t("auth.login.password")}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
        />
        {error && (
          <p className="text-africhess-terracotta text-sm" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
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
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="p-8 text-center">{t("common.loading")}</div>}>
      <LoginContent />
    </Suspense>
  );
}
