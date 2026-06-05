"use client";

import { useEffect, useState } from "react";
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
}

export default function PremiumPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<{ tier: string; is_premium: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .subscriptionPlans()
      .then(({ data }) => setPlans(data.plans ?? []))
      .catch((err) => setError(formatApiError(err, t("premium.error.load"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!user) return;
    usersApi.subscriptionStatus().then(({ data }) => setStatus(data)).catch(() => {});
  }, [user]);

  const subscribe = async (planId: "gold" | "diamond") => {
    if (!user) return;
    setSubscribing(planId);
    setError(null);
    try {
      const { data } = await usersApi.subscribe(planId);
      setStatus({ tier: data.tier, is_premium: data.is_premium });
      setMsg(data.message || t("premium.subscribed"));
    } catch (err) {
      setError(formatApiError(err, t("premium.error.subscribe")));
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("premium.title")}</h1>
      <p className="opacity-70 mb-6">{t("premium.subtitle")}</p>

      {status?.is_premium && (
        <div className="glass-card p-4 mb-6 border border-africhess-gold/30">
          <p className="text-africhess-gold font-medium">
            {t("premium.active", { tier: status.tier })}
          </p>
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
            </ul>
            {plan.id !== "free" && user && (
              <button
                type="button"
                disabled={subscribing === plan.id || status?.tier === plan.id}
                onClick={() => subscribe(plan.id as "gold" | "diamond")}
                className="w-full py-2 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
              >
                {subscribing === plan.id
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

      <p className="text-xs opacity-50 mt-8 text-center">{t("premium.demoNote")}</p>
    </div>
  );
}
