"use client";

import { useTranslation } from "@/hooks/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/10 bg-[var(--card)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-opacity-70">
        <div>
          <p className="font-display text-lg font-bold text-africhess-gold">AFRICHESS</p>
          <p className="mt-1">{t("footer.tagline")}</p>
        </div>
        <div className="text-center md:text-right">
          <p>© {new Date().getFullYear()} AFRICHESS</p>
          <p className="mt-1">Developer: Maxime Dzidula KELI</p>
          <a href="https://wa.me/33754830039" className="text-africhess-green hover:underline">
            WhatsApp: +33 754830039
          </a>
        </div>
      </div>
    </footer>
  );
}
