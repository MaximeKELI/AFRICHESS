"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/10 bg-[var(--card)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
        <div className="text-center md:text-left">
          <p className="font-display text-lg font-bold text-africhess-gold">AFRICHESS</p>
          <p className="mt-1 opacity-70">{t("footer.tagline")}</p>
          <nav className="flex flex-wrap justify-center md:justify-start gap-3 mt-3 text-africhess-gold">
            <Link href="/play" className="hover:underline">
              {t("nav.play")}
            </Link>
            <Link href="/puzzles" className="hover:underline">
              {t("nav.puzzles")}
            </Link>
            <Link href="/legal/privacy" className="hover:underline">
              {t("footer.privacy")}
            </Link>
          </nav>
        </div>
        <div className="text-center md:text-right space-y-1 opacity-60 text-xs">
          <p>© {new Date().getFullYear()} AFRICHESS</p>
          <p>{t("footer.developer", { name: "Maxime Dzidula KELI" })}</p>
          <a href="https://wa.me/33754830039" className="text-africhess-green hover:underline block">
            {t("footer.contact")}
          </a>
        </div>
      </div>
    </footer>
  );
}
