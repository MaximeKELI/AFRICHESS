"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usersApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

export default function SubscriptionSettingsPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<{
    tier: string;
    is_premium: boolean;
    has_billing_portal?: boolean;
    premium_until?: string | null;
    stripe_enabled?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    usersApi
      .subscriptionStatus()
      .then(({ data }) => setStatus(data))
      .catch((err) => setError(formatApiError(err, t("premium.error.load"))));
  }, [user, t]);

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const { data } = await usersApi.billingPortal();
      if (data.portal_url) window.location.href = data.portal_url;
    } catch (err) {
      setError(formatApiError(err, t("premium.manageError")));
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p>{t("play.loginRequired")}</p>
        <Link href="/login" className="text-africhess-gold hover:underline">
          {t("app.login")}
        </Link>
      </div>
    );
  }

  const untilLabel =
    status?.premium_until && status.is_premium
      ? new Date(status.premium_until).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")
      : null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <Link href="/profile" className="text-sm text-africhess-gold hover:underline">
        {t("settings.subscription.back")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("settings.subscription.title")}</h1>
        <p className="text-sm opacity-60 mt-2">{t("settings.subscription.subtitle")}</p>
      </div>

      {error && (
        <InlineAlert className="mb-2" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <div className="glass-card p-5 space-y-3">
        <p className="text-sm opacity-60">{t("premium.current")}</p>
        <p className="text-xl font-semibold capitalize">{status?.tier ?? user.subscription_tier ?? "free"}</p>
        {status?.is_premium && untilLabel && (
          <p className="text-sm text-africhess-gold">{t("premium.until", { date: untilLabel })}</p>
        )}
        {!status?.is_premium && (
          <Link
            href="/premium"
            className="inline-block mt-2 text-sm text-africhess-gold hover:underline"
          >
            {t("settings.subscription.upgrade")}
          </Link>
        )}
      </div>

      {status?.has_billing_portal && (
        <button
          type="button"
          disabled={portalLoading}
          onClick={() => void openPortal()}
          className="w-full py-3 rounded-xl border border-africhess-gold/50 font-medium hover:bg-africhess-gold/10 disabled:opacity-50"
        >
          {portalLoading ? t("common.loading") : t("premium.manage")}
        </button>
      )}
    </div>
  );
}
