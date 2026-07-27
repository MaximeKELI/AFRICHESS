"use client";

import Link from "next/link";
import { Heart, MessageCircle, ExternalLink, Crown } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ButtonLink } from "@/components/ui/Button";

const STRIPE_DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL?.trim() || "";
const PAYPAL_DONATE_URL = process.env.NEXT_PUBLIC_PAYPAL_DONATE_URL?.trim() || "";
const WHATSAPP_DONATE = "https://wa.me/33754830039?text=Bonjour%2C%20je%20souhaite%20soutenir%20AFRICHESS";

export default function DonatePage() {
  const { t } = useTranslation();
  const hasStripe = Boolean(STRIPE_DONATE_URL);
  const hasPaypal = Boolean(PAYPAL_DONATE_URL);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-africhess-gold/15 text-africhess-gold mb-4">
          <Heart className="w-7 h-7" aria-hidden />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold heading-gradient">
          {t("donate.title")}
        </h1>
        <p className="mt-3 text-muted max-w-xl mx-auto leading-relaxed">
          {t("donate.subtitle")}
        </p>
      </div>

      <div className="glass-card p-6 sm:p-8 space-y-6">
        <p className="text-sm leading-relaxed opacity-90">{t("donate.body")}</p>

        <ul className="text-sm space-y-2 opacity-80">
          <li>✓ {t("donate.point.servers")}</li>
          <li>✓ {t("donate.point.features")}</li>
          <li>✓ {t("donate.point.community")}</li>
        </ul>

        <div className="premium-divider" />

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-africhess-gold/80">
            {t("donate.how")}
          </p>

          {hasStripe && (
            <a
              href={STRIPE_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 w-full rounded-xl border border-africhess-gold/40 bg-africhess-gold/10 px-4 py-3 text-sm font-medium hover:bg-africhess-gold/20 transition-colors"
            >
              <span>{t("donate.stripe")}</span>
              <ExternalLink className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
            </a>
          )}

          {hasPaypal && (
            <a
              href={PAYPAL_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium hover:border-africhess-gold/40 transition-colors"
            >
              <span>{t("donate.paypal")}</span>
              <ExternalLink className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
            </a>
          )}

          <a
            href={WHATSAPP_DONATE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full rounded-xl border border-africhess-green/40 bg-africhess-green/10 px-4 py-3 text-sm font-medium text-africhess-green hover:bg-africhess-green/20 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" aria-hidden />
              {t("donate.whatsapp")}
            </span>
            <ExternalLink className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
          </a>

          {!hasStripe && !hasPaypal && (
            <p className="text-xs opacity-55 leading-relaxed">{t("donate.manualHint")}</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
          <p className="text-sm font-medium inline-flex items-center gap-2">
            <Crown className="w-4 h-4 text-africhess-gold" aria-hidden />
            {t("donate.premiumAlt")}
          </p>
          <p className="text-xs opacity-60 leading-relaxed">{t("donate.premiumHint")}</p>
          <ButtonLink href="/premium" variant="secondary" size="sm">
            {t("nav.premium")}
          </ButtonLink>
        </div>
      </div>

      <p className="mt-8 text-center text-xs opacity-50">
        <Link href="/" className="hover:text-africhess-gold transition-colors">
          {t("donate.backHome")}
        </Link>
      </p>
    </div>
  );
}
