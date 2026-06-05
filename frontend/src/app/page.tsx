"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { Trophy, Users, Zap, Globe2, Puzzle } from "lucide-react";

const featureKeys = [
  { icon: Zap, titleKey: "home.feature.realtime.title", descKey: "home.feature.realtime.desc" },
  { icon: Puzzle, titleKey: "home.feature.puzzles.title", descKey: "home.feature.puzzles.desc" },
  { icon: Trophy, titleKey: "home.feature.leaderboards.title", descKey: "home.feature.leaderboards.desc" },
  { icon: Users, titleKey: "home.feature.community.title", descKey: "home.feature.community.desc" },
  { icon: Globe2, titleKey: "home.feature.languages.title", descKey: "home.feature.languages.desc" },
] as const;

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 dark:opacity-10 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/images/pattern-bg.png')" }}
      />

      <section className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Image
            src="/images/logo.png"
            alt="AFRICHESS"
            width={120}
            height={120}
            className="mx-auto mb-8 rounded-2xl shadow-2xl"
          />
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-africhess-gold via-africhess-terracotta to-africhess-green bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-lg md:text-xl opacity-80 mb-10">{t("hero.subtitle")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/play?mode=blitz"
              className="px-8 py-3 african-gradient text-white rounded-xl font-semibold text-lg hover:scale-105 transition-transform"
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

        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {(["bullet", "blitz", "rapid", "classical"] as const).map((mode) => (
            <Link
              key={mode}
              href={`/play?mode=${mode}`}
              className="px-4 py-2 rounded-full border border-white/20 text-sm hover:border-africhess-gold hover:text-africhess-gold transition-colors capitalize"
            >
              {t(`modes.${mode}`)}
            </Link>
          ))}
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureKeys.map(({ icon: Icon, titleKey, descKey }, i) => (
            <motion.div
              key={titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <Icon className="w-8 h-8 text-africhess-gold mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t(titleKey)}</h3>
              <p className="text-sm opacity-70">{t(descKey)}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
