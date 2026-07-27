"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { AdCarousel } from "./AdCarousel";

const FOOTER_SECTIONS = [
  {
    titleKey: "nav.play" as const,
    links: [
      { href: "/play", key: "nav.play" as const },
      { href: "/lobby", key: "nav.lobby" as const },
      { href: "/tournaments", key: "nav.tournaments" as const },
    ],
  },
  {
    titleKey: "nav.puzzles" as const,
    links: [
      { href: "/puzzles", key: "nav.puzzles" as const },
      { href: "/learning", key: "nav.learn" as const },
      { href: "/leaderboard", key: "leaderboard.title" as const },
    ],
  },
  {
    titleKey: "nav.community" as const,
    links: [
      { href: "/clubs", key: "home.feature.community.title" as const },
      { href: "/forum", key: "nav.forums" as const },
      { href: "/blog", key: "nav.blog" as const },
      { href: "/donate", key: "footer.donate" as const },
    ],
  },
] as const;

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer-premium mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="font-display text-2xl font-bold heading-gradient">AFRICHESS</p>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-xs">{t("footer.tagline")}</p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.titleKey}>
              <p className="text-xs uppercase tracking-wider font-semibold text-africhess-gold/80 mb-3">
                {t(section.titleKey)}
              </p>
              <nav className="flex flex-col gap-2">
                {section.links.map(({ href, key }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-sm text-muted hover:text-africhess-gold transition-colors duration-200"
                  >
                    {t(key)}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="premium-divider my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} AFRICHESS</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/donate" className="hover:text-africhess-gold transition-colors font-medium">
              {t("footer.donate")}
            </Link>
            <Link href="/legal/privacy" className="hover:text-africhess-gold transition-colors">
              {t("footer.privacy")}
            </Link>
            <a
              href="https://wa.me/33754830039"
              className="text-africhess-green hover:underline"
            >
              {t("footer.contact")}
            </a>
          </div>
          <p>{t("footer.developer", { name: "Maxime Dzidula KELI" })}</p>
        </div>
      </div>
      <AdCarousel />
    </footer>
  );
}
