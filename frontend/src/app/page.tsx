"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

const featureLinks = [
  { href: "/play", titleKey: "home.feature.realtime.title", descKey: "home.feature.realtime.desc" },
  { href: "/puzzles", titleKey: "home.feature.puzzles.title", descKey: "home.feature.puzzles.desc" },
  { href: "/leaderboard", titleKey: "home.feature.leaderboards.title", descKey: "home.feature.leaderboards.desc" },
  { href: "/clubs", titleKey: "home.feature.community.title", descKey: "home.feature.community.desc" },
  { href: "/learning", titleKey: "home.feature.languages.title", descKey: "home.feature.languages.desc" },
] as const;

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 dark:opacity-10 bg-cover bg-center pointer-events-none home-default-pattern"
        style={{ backgroundImage: "url('/images/pattern-bg.png')" }}
      />

      <section className="relative min-h-[min(100dvh,720px)] flex flex-col justify-center max-w-7xl mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-center"
        >
          <Image
            src="/images/logo.png"
            alt=""
            width={96}
            height={96}
            className="mx-auto mb-6 rounded-2xl shadow-2xl"
            priority
          />
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 tracking-tight bg-gradient-to-r from-africhess-gold via-africhess-terracotta to-africhess-green bg-clip-text text-transparent">
            AFRICHESS
          </h1>
          <p className="text-base md:text-lg opacity-75 max-w-xl mx-auto mb-10">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              href="/play?mode=blitz"
              className="px-8 py-3 african-gradient text-white rounded-xl font-semibold text-lg hover:scale-[1.02] transition-transform"
            >
              {t("hero.play")}
            </Link>
            <Link
              href="/puzzles"
              className="px-8 py-3 border-2 border-africhess-gold text-africhess-gold rounded-xl font-semibold text-lg hover:bg-africhess-gold/10 transition-colors"
            >
              {t("hero.puzzles")}
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="relative max-w-3xl mx-auto px-4 pb-20 pt-4 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="font-display text-2xl font-bold mb-2">{t("home.why.title")}</h2>
          <p className="text-sm opacity-70">{t("home.why.subtitle")}</p>
        </motion.div>
        <ul className="space-y-5">
          {featureLinks.map(({ href, titleKey, descKey }, i) => (
            <motion.li
              key={titleKey}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
            >
              <Link href={href} className="group block border-b border-white/10 pb-5 hover:border-africhess-gold/40 transition-colors">
                <h3 className="font-semibold text-lg group-hover:text-africhess-gold transition-colors">
                  {t(titleKey)}
                </h3>
                <p className="text-sm opacity-70 mt-1">{t(descKey)}</p>
              </Link>
            </motion.li>
          ))}
        </ul>
      </section>
    </div>
  );
}
