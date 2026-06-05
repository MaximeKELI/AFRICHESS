"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { LevelPicker } from "@/components/profile/LevelPicker";
import type { ChessLevelId } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    country: "SN",
    chess_level: "intermediate" as ChessLevelId,
  });
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const { register, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailTaken(false);

    if (form.username.trim().length < 3) {
      setError(t("auth.register.error.usernameMin"));
      return;
    }
    if (form.password.length < 8) {
      setError(t("auth.register.error.passwordMin"));
      return;
    }
    if (form.password !== form.password_confirm) {
      setError(t("auth.register.error.passwordMismatch"));
      return;
    }

    try {
      await register(form);
      router.push("/play");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.register.error.failed");
      setError(msg);
      if (msg.includes("e-mail") && (msg.includes("déjà") || msg.includes("compte") || msg.includes("already"))) {
        setEmailTaken(true);
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-2 text-center">{t("auth.register.title")}</h1>
      <p className="text-center opacity-70 mb-8 text-sm">{t("auth.register.subtitle")}</p>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        <LevelPicker
          value={form.chess_level}
          onChange={(chess_level) => setForm({ ...form, chess_level })}
        />
        <p className="text-xs opacity-50 -mt-2">{t("auth.register.levelHint")}</p>

        <hr className="border-white/10" />

        <input
          type="text"
          placeholder={t("auth.register.username")}
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
          minLength={3}
        />
        <input
          type="email"
          placeholder={t("auth.register.email")}
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
        />
        <input
          type="password"
          placeholder={t("auth.register.password")}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
          minLength={8}
        />
        <input
          type="password"
          placeholder={t("auth.register.passwordConfirm")}
          autoComplete="new-password"
          value={form.password_confirm}
          onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
          minLength={8}
        />
        <select
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          aria-label={t("auth.register.country")}
        >
          <option value="SN">Sénégal</option>
          <option value="NG">Nigeria</option>
          <option value="EG">Égypte</option>
          <option value="ZA">Afrique du Sud</option>
          <option value="KE">Kenya</option>
          <option value="MA">Maroc</option>
          <option value="GH">Ghana</option>
          <option value="CI">Côte d&apos;Ivoire</option>
          <option value="CM">Cameroun</option>
          <option value="XX">Autre</option>
        </select>

        {error && (
          <div className="text-africhess-terracotta text-sm space-y-2" role="alert">
            <p>{error}</p>
            {emailTaken && (
              <p>
                <Link href="/login" className="text-africhess-gold underline font-medium">
                  {t("auth.register.emailTaken")}
                </Link>
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 african-gradient text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? t("auth.register.submitting") : t("auth.register.submit")}
        </button>
        <OAuthButtons />
        <p className="text-center text-sm">
          {t("auth.register.hasAccount")}{" "}
          <Link href="/login" className="text-africhess-gold underline">
            {t("auth.register.login")}
          </Link>
        </p>
      </form>
    </div>
  );
}
