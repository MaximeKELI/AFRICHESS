"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swords, Puzzle, Trophy, Users, Globe2, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import {
  canAutoplayLogoSound,
  hasPlayedLogoLandSound,
  playLogoLandSound,
  playLogoLandSoundFromGesture,
  preloadLogoLandSound,
  resetLogoLandSoundForNewPageLoad,
  unlockLogoLandAudio,
} from "@/lib/logoIntroSound";

/** Sync avec ~68% de 0.72s (impact au sol) */
const SLAM_LAND_MS = 490;

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

type LogoPhase = "pending" | "slam" | "idle";

export default function HomePage() {
  const { t } = useTranslation();
  const [logoPhase, setLogoPhase] = useState<LogoPhase>("pending");
  /** Autoplay refusé → on attend un geste pour slam + son ensemble */
  const needsGestureRef = useRef(false);
  const slamStartedRef = useRef(false);

  useLayoutEffect(() => {
    resetLogoLandSoundForNewPageLoad();
    needsGestureRef.current = false;
    slamStartedRef.current = false;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setLogoPhase("idle");
      return;
    }

    preloadLogoLandSound();

    let cancelled = false;
    const startSlam = () => {
      if (cancelled || slamStartedRef.current) return;
      slamStartedRef.current = true;
      setLogoPhase("slam");
    };

    void canAutoplayLogoSound().then((ok) => {
      if (cancelled) return;
      if (ok) {
        needsGestureRef.current = false;
        startSlam();
      } else {
        // Pas de son sans geste → logo visible ; 1er clic = slam + son
        needsGestureRef.current = true;
        setLogoPhase("idle");
      }
    });

    const fallback = window.setTimeout(() => {
      if (!slamStartedRef.current) setLogoPhase((p) => (p === "pending" ? "idle" : p));
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (logoPhase !== "slam") return;

    const land = window.setTimeout(() => {
      // Après geste : contexte déjà débloqué → buffer à l’impact
      playLogoLandSound();
      if (!hasPlayedLogoLandSound()) {
        playLogoLandSoundFromGesture();
      }
    }, SLAM_LAND_MS);

    return () => window.clearTimeout(land);
  }, [logoPhase]);

  const onHomePointerDown = () => {
    unlockLogoLandAudio();

    if (needsGestureRef.current && !slamStartedRef.current) {
      // play() dans le geste = seul chemin 100% fiable (Safari / autoplay off)
      playLogoLandSoundFromGesture();
      slamStartedRef.current = true;
      setLogoPhase("slam");
      return;
    }

    if (!hasPlayedLogoLandSound()) {
      playLogoLandSoundFromGesture();
    }
  };

  return (
    <div className="relative overflow-hidden" onPointerDown={onHomePointerDown}>
      <div
        className="absolute inset-0 opacity-[0.14] dark:opacity-[0.08] bg-cover bg-center pointer-events-none home-default-pattern"
        style={{ backgroundImage: "url('/images/pattern-bg.png')" }}
      />
      <div className="hero-glow" aria-hidden />
      <div className="hero-orb hero-orb-a" aria-hidden />
      <div className="hero-orb hero-orb-b" aria-hidden />
      <div className="hero-orb hero-orb-c" aria-hidden />

      {/* Précharge le fichier dans le DOM (certains navigateurs sont plus permissifs) */}
      <audio src="/sounds/themes/standard/move.mp3" preload="auto" playsInline aria-hidden className="hidden" />

      <section className="relative min-h-[min(100dvh,760px)] flex flex-col justify-center max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center">
          <div
            className={clsx(
              "relative inline-block mb-8",
              logoPhase === "slam" && "hero-logo-slam",
              logoPhase === "idle" && "hero-logo-idle",
              logoPhase === "pending" && "opacity-0"
            )}
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return;
              if (logoPhase === "slam" && e.animationName.includes("hero-logo-slam")) {
                setLogoPhase("idle");
              }
            }}
          >
            <div className="hero-logo-ring" aria-hidden />
            <div className="hero-logo-impact" aria-hidden />
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
              alt="AFRICHESS"
              width={112}
              height={112}
              priority
              className="relative mx-auto drop-shadow-lg rounded-2xl"
            />
          </div>

          <p className="text-xs md:text-sm uppercase tracking-[0.28em] text-muted font-medium mb-4 hero-eyebrow">
            {t("home.tagline")}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight heading-gradient mb-5 hero-title-in">
            AFRICHESS
          </h1>
          <p className="text-base md:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed hero-subtitle-in">
            {t("home.subtitle")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 hero-cta-in">
            <ButtonLink href="/play" variant="hero" className="min-w-[148px]">
              {t("nav.play")}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/puzzles" variant="secondary" className="min-w-[148px]">
              {t("nav.puzzles")}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 pb-20 md:pb-28">
        <Reveal>
          <div className="text-center mb-10 md:mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              {t("home.why.title")}
            </h2>
            <p className="text-muted max-w-lg mx-auto">{t("home.why.subtitle")}</p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {featureLinks.map(({ href, titleKey, descKey, icon: Icon }, i) => (
            <Reveal key={href} delayMs={i * 70}>
              <Link
                href={href}
                className="glass-card block p-5 md:p-6 h-full transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-[var(--gold)]">
                    <Icon className="w-5 h-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold tracking-tight">{t(titleKey)}</h3>
                    <p className="text-sm text-muted mt-1.5 leading-relaxed">{t(descKey)}</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
