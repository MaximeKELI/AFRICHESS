"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import { FLAIR_OPTIONS } from "@/lib/flair";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

/** Sélecteur de flair (badge emoji) pour le profil */
export function FlairPicker() {
  const { user, fetchProfile } = useAuthStore();
  const { t, locale } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const current = user.flair ?? "";

  const select = async (emoji: string) => {
    if (emoji === current) return;
    setSaving(true);
    setError(null);
    try {
      await authApi.updateProfile({ flair: emoji });
      await fetchProfile();
    } catch (err) {
      setError(formatApiError(err, t("profile.flair.error")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("profile.flair.title")}</p>
      <p className="text-xs opacity-55">{t("profile.flair.hint")}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("profile.flair.title")}>
        {FLAIR_OPTIONS.map((opt) => {
          const selected = (opt.emoji || "") === current;
          const label = locale === "fr" ? opt.labelFr : opt.labelEn;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={saving}
              onClick={() => select(opt.emoji)}
              className={`w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-colors ${
                selected ? "border-africhess-gold bg-africhess-gold/20" : "border-white/20 hover:bg-white/10"
              } disabled:opacity-50`}
              title={label}
              aria-label={label}
            >
              {opt.emoji || "—"}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-africhess-terracotta" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
