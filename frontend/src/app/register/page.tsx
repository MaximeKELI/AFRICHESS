"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { LevelPicker } from "@/components/profile/LevelPicker";
import { CountryPicker } from "@/components/auth/CountryPicker";
import type { ChessLevelId } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";
import { LOCALES, type Locale } from "@/lib/i18n";

const DISCOVERY_KEYS = [
  "friend",
  "social",
  "search",
  "tournament",
  "school",
  "press",
  "other",
] as const;

const LANGUAGE_OPTIONS: { value: Locale; labelKey: string }[] = [
  { value: "fr", labelKey: "Français" },
  { value: "en", labelKey: "English" },
  { value: "ar", labelKey: "العربية" },
  { value: "pt", labelKey: "Português" },
  { value: "sw", labelKey: "Kiswahili" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    country: "SN",
    city: "",
    chess_level: "intermediate" as ChessLevelId,
    preferred_language: "fr" as Locale,
    birth_year: "",
    gender: "",
    discovery_source: "",
  });
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const { register, isLoading, locale, setLocale } = useAuthStore();
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

    const birthYear = form.birth_year ? parseInt(form.birth_year, 10) : undefined;
    if (form.birth_year && (Number.isNaN(birthYear) || birthYear! < 1940)) {
      setError(t("auth.register.error.birthYear"));
      return;
    }

    try {
      if (form.preferred_language !== locale) {
        setLocale(form.preferred_language);
      }
      await register({
        ...form,
        birth_year: birthYear,
        registration_locale: form.preferred_language,
      });
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

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-8">
        <section className="space-y-4">
          <LevelPicker
            value={form.chess_level}
            onChange={(chess_level) => setForm({ ...form, chess_level })}
          />
          <p className="text-xs opacity-50 -mt-2">{t("auth.register.levelHint")}</p>
        </section>

        <hr className="border-white/10" />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-africhess-gold">{t("auth.register.section.account")}</h2>
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
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-africhess-gold">{t("auth.register.section.location")}</h2>
          <CountryPicker
            value={form.country}
            onChange={(country) => setForm({ ...form, country })}
          />
          <input
            type="text"
            placeholder={t("auth.register.city")}
            autoComplete="address-level2"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border bg-transparent"
            maxLength={100}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-africhess-gold">{t("auth.register.section.preferences")}</h2>
          <label className="block text-sm font-medium mb-1.5">{t("auth.register.language")}</label>
          <select
            value={form.preferred_language}
            onChange={(e) => setForm({ ...form, preferred_language: e.target.value as Locale })}
            className="w-full px-4 py-3 rounded-lg border bg-transparent"
          >
            {LANGUAGE_OPTIONS.filter((o) => LOCALES.includes(o.value)).map((o) => (
              <option key={o.value} value={o.value}>
                {o.labelKey}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-africhess-gold">{t("auth.register.section.profile")}</h2>
            <p className="text-xs opacity-50 mt-1">{t("auth.register.section.profileHint")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("auth.register.birthYear")}</label>
              <input
                type="number"
                min={1940}
                max={new Date().getFullYear() - 5}
                placeholder={t("auth.register.birthYearPlaceholder")}
                value={form.birth_year}
                onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("auth.register.gender")}</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border bg-transparent"
              >
                <option value="">{t("auth.register.gender.undisclosed")}</option>
                <option value="male">{t("auth.register.gender.male")}</option>
                <option value="female">{t("auth.register.gender.female")}</option>
                <option value="other">{t("auth.register.gender.other")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("auth.register.discovery")}</label>
            <select
              value={form.discovery_source}
              onChange={(e) => setForm({ ...form, discovery_source: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border bg-transparent"
            >
              <option value="">{t("auth.register.discovery.placeholder")}</option>
              {DISCOVERY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`auth.register.discovery.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </section>

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
