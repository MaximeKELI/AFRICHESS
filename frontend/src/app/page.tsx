"use client";

import Image from "next/image";
import Link from "next/link";
import { Swords, Puzzle, Trophy, Users, Globe2, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ButtonLink } from "@/components/ui/Button";

const featureLinks = [
  {
    href: "/play",
    titleKey: "home.feature.realtime.title",
    descKey: "home.feature.realtime.desc",
    icon: Swords,
  },
  {
    href: "/puzzles",
    titleKey: "home.feature.puzzles.title",
    descKey: "home.feature.puzzles.desc",
    icon: Puzzle,
  },
  {
    href: "/leaderboard",
    titleKey: "home.feature.leaderboards.title",
    descKey: "home.feature.leaderboards.desc",
    icon: Trophy,
  },
  {
    href: "/clubs",
    titleKey: "home.feature.community.title",
    descKey: "home.feature.community.desc",
    icon: Users,
  },
  {
    href: "/learning",
    titleKey: "home.feature.languages.title",
    descKey: "home.feature.languages.desc",
    icon: Globe2,
  },
] as const;

const staggerDelays = ["", "delay-75", "delay-150", "delay-200", "delay-300"] as const;

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.14] dark:opacity-[0.08] bg-cover bg-center pointer-events-none home-default-pattern"
        style={{ backgroundImage: "url('/images/pattern-bg.png')" }}
      />
      <div className="hero-glow" aria-hidden />

      <section className="relative min-h-[min(100dvh,760px)] flex flex-col justify-center max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center animate-slide-up">
          <div className="relative inline-block mb-8">
            <div
              className="absolute -inset-3 rounded-3xl opacity-40 blur-xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--gold) 35%, transparent), transparent 70%)",
              }}
              aria-hidden
            />
            <Image
              src="/images/logo.png"
              alt=""
              width={104}
              height={104}
              className="relative mx-auto rounded-2xl shadow-premium-lg ring-1 ring-[var(--border-subtle)]"
              priority
            />
          </div>

          <p className="text-xs md:text-sm uppercase tracking-[0.28em] text-muted font-medium mb-4 animate-fade-in animation-delay-100">
            Global Chess Platform
          </p>
          <h1 className="heading-gradient text-5xl md:text-7xl lg:text-8xl mb-5 animate-fade-in animation-delay-150">
            AFRICHESS
          </h1>
          <p className="text-base md:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed animate-fade-in animation-delay-200">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 animate-fade-in animation-delay-300">
            <ButtonLink href="/play?mode=blitz" variant="hero">
              {t("hero.play")}
            </ButtonLink>
            <ButtonLink href="/puzzles" variant="secondary" size="lg">
              {t("hero.puzzles")}
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="premium-divider max-w-2xl mx-auto mb-16 opacity-80" />

      <section className="relative max-w-6xl mx-auto px-4 pb-24 pt-2">
        <div className="text-center mb-12 animate-slide-up-sm">
          <h2 className="heading-display text-3xl md:text-4xl mb-3">{t("home.why.title")}</h2>
          <p className="text-muted max-w-lg mx-auto">{t("home.why.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureLinks.map(({ href, titleKey, descKey, icon: Icon }, i) => (
            <ButtonLink
              key={titleKey}
              href={href}
              variant="ghost"
              className={`feature-card group text-left h-full animate-slide-up-sm ${staggerDelays[i] ?? "delay-300"} !px-0 !py-0 !rounded-2xl !justify-start !items-stretch`}
            >
              <span className="block p-5 md:p-6 w-full">
                <span className="feature-card-icon">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-semibold text-lg group-hover:text-africhess-gold transition-colors duration-200">
                      {t(titleKey)}
                    </span>
                    <span className="block text-sm text-muted mt-1.5 leading-relaxed">{t(descKey)}</span>
                  </span>
                  <ArrowRight
                    size={18}
                    className="shrink-0 mt-1 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all duration-200 text-africhess-gold"
                  />
                </span>
              </span>
            </ButtonLink>
          ))}
        </div>
      </section>
    </div>
  );
}
