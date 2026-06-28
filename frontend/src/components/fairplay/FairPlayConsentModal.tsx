"use client";

import { useState } from "react";
import { gamesApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface FairPlayConsentModalProps {
  open: boolean;
  onAccepted: () => void;
  onDecline?: () => void;
}

export function FairPlayConsentModal({ open, onAccepted, onDecline }: FairPlayConsentModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const accept = async () => {
    setLoading(true);
    setError(null);
    try {
      await gamesApi.fairplayConsent();
      onAccepted();
    } catch {
      setError(t("fairplay.consent.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-labelledby="fairplay-consent-title"
    >
      <div className="max-w-lg w-full rounded-xl border border-white/10 bg-africhess-navy p-6 shadow-2xl">
        <h2 id="fairplay-consent-title" className="font-display text-xl font-bold mb-3">
          {t("fairplay.consent.title")}
        </h2>
        <p className="text-sm opacity-80 mb-3">{t("fairplay.consent.intro")}</p>
        <ul className="text-sm opacity-75 space-y-1.5 mb-4 list-disc pl-5">
          <li>{t("fairplay.consent.item.timing")}</li>
          <li>{t("fairplay.consent.item.focus")}</li>
          <li>{t("fairplay.consent.item.input")}</li>
          <li>{t("fairplay.consent.item.engine")}</li>
        </ul>
        <p className="text-xs opacity-60 mb-5">{t("fairplay.consent.legal")}</p>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <div className="flex flex-wrap gap-3 justify-end">
          {onDecline && (
            <button
              type="button"
              onClick={onDecline}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5"
            >
              {t("fairplay.consent.decline")}
            </button>
          )}
          <button
            type="button"
            onClick={accept}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-africhess-gold text-black font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("fairplay.consent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
