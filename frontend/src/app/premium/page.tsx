"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usersApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

interface Plan {
  id: string;
  name?: string;
  price_eur: number;
  features: string[];
  analysis_moves?: number;
}

export default function PremiumPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<p className="max-w-4xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>}>
      <PremiumContent />
    </Suspense>
  );
}

function PremiumContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const { user, fetchProfile } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [status, setStatus] = useState<{
    tier: string;
    is_premium: boolean;
    has_billing_portal?: boolean;
    premium_until?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadStatus = () => {
    if (!user) return;
    usersApi.subscriptionStatus().then(({ data }) => setStatus(data)).catch(() => {});
  };

  useEffect(() => {
    usersApi
      .subscriptionPlans()
      .then(({ data }) => {
        setPlans(data.plans ?? []);
        setStripeEnabled(Boolean(data.stripe_enabled));
      })
      .catch((err) => setError(formatApiError(err, t("premium.error.load"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadStatus();
  }, [user]);

  useEffect(() => {
    const success = searchParams.get("success");
    const plan = searchParams.get("plan");
    const canceled = searchParams.get("canceled");
    if (canceled === "1") {
      setMsg(t("premium.canceled"));
      return;
    }
    if (success === "1" && user) {
      void fetchProfile().then(loadStatus);
      setMsg(t("premium.success", { tier: plan ?? status?.tier ?? "Premium" }));
    }
  }, [searchParams, user, fetchProfile, t, status?.tier]);

  const subscribe = async (planId: "gold" | "diamond") => {
    if (!user) return;
    if (!stripeEnabled) {
      setError(t("premium.unavailable"));
      return;
    }
    setSubscribing(planId);
    setError(null);
    try {
      const { data } = await usersApi.subscribe(planId);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setError(t("premium.unavailable"));
    } catch (err) {
      setError(formatApiError(err, t("premium.error.subscribe")));
    } finally {
      setSubscribing(null);
    }
  };

  const openBillingPortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    setError(null);
    try {
      const { data } = await usersApi.billingPortal();
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    } catch (err) {
      setError(formatApiError(err, t("premium.manageError")));
    } finally {
      setPortalLoading(false);
    }
  };

  const premiumUntilLabel =
    status?.premium_until && status.is_premium
      ? t("premium.until", {
          date: new Date(status.premium_until).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US"),
        })
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("premium.title")}</h1>
      <p className="opacity-70 mb-6">{t("premium.subtitle")}</p>

      {status?.is_premium && (
        <div className="glass-card p-4 mb-6 border border-africhess-gold/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-africhess-gold font-medium">
              {t("premium.active", { tier: status.tier })}
            </p>
            {premiumUntilLabel && (
              <p className="text-xs opacity-60 mt-1">{premiumUntilLabel}</p>
            )}
          </div>
          {status.has_billing_portal && stripeEnabled && (
            <button
              type="button"
              disabled={portalLoading}
              onClick={() => void openBillingPortal()}
              className="px-4 py-2 rounded-lg border border-africhess-gold/50 text-sm font-medium hover:bg-africhess-gold/10 disabled:opacity-50"
            >
              {portalLoading ? t("common.loading") : t("premium.manage")}
            </button>
          )}
        </div>
      )}

      {msg && (
        <InlineAlert variant="info" className="mb-4" onDismiss={() => setMsg(null)}>
          {msg}
        </InlineAlert>
      )}
      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {loading && <p className="opacity-60">{t("common.loading")}</p>}

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`glass-card p-6 flex flex-col ${
              plan.id === "diamond" ? "ring-2 ring-africhess-gold/40" : ""
            }`}
          >
            <h2 className="font-display text-xl font-bold capitalize mb-1">
              {plan.id === "free" ? t("premium.free") : plan.id}
            </h2>
            <p className="text-2xl font-mono text-africhess-gold mb-4">
              {plan.price_eur === 0 ? t("premium.freePrice") : `€${plan.price_eur}/mo`}
            </p>
            <ul className="text-sm space-y-2 mb-6 flex-1 opacity-80">
              {plan.features.map((f) => (
                <li key={f}>✓ {t(`premium.feature.${f}`, { defaultValue: f })}</li>
              ))}
              {typeof plan.analysis_moves === "number" && (
                <li>
                  ✓{" "}
                  {t("premium.analysisMoves", {
                    count: plan.analysis_moves,
                  })}
                </li>
              )}
            </ul>
            {plan.id !== "free" && user && (
              <button
                type="button"
                disabled={!stripeEnabled || subscribing === plan.id || status?.tier === plan.id}
                onClick={() => subscribe(plan.id as "gold" | "diamond")}
                className="w-full py-2 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
              >
                {!stripeEnabled
                  ? t("premium.unavailable")
                  : subscribing === plan.id
                    ? t("premium.subscribing")
                    : status?.tier === plan.id
                      ? t("premium.current")
                      : t("premium.subscribe")}
              </button>
            )}
            {plan.id !== "free" && !user && (
              <p className="text-xs opacity-60 text-center">{t("premium.loginHint")}</p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs opacity-50 mt-8 text-center">
        {stripeEnabled ? t("premium.stripeNote") : t("premium.demoNote")}
      </p>
      <p className="text-center mt-4">
        <Link href="/donate" className="text-sm text-africhess-gold hover:underline">
          {t("footer.donate")}
        </Link>
      </p>
    </div>
  );
}
