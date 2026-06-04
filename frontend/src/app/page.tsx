"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { t } from "@/lib/i18n";
import { Trophy, Users, Zap, Globe2, Puzzle } from "lucide-react";

const features = [
  { icon: Zap, title: "Real-time Play", desc: "Blitz, Bullet & Rapid with ELO matchmaking" },
  { icon: Puzzle, title: "Daily Puzzles", desc: "Sharpen tactics with curated training" },
  { icon: Trophy, title: "African Leaderboards", desc: "Compete by country and continent" },
  { icon: Users, title: "Clubs & Community", desc: "Join African chess communities" },
  { icon: Globe2, title: "5 Languages", desc: "English, French, Arabic, Portuguese, Swahili" },
];

export default function HomePage() {
  const { locale } = useAuthStore();

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
          className="text-center max-w-3xl mx-auto"
        >
          <Image
            src="/images/logo.png"
            alt="AFRICHESS"
            width={120}
            height={120}
            className="mx-auto mb-8 rounded-2xl shadow-lg"
          />
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
            {t(locale, "hero.title")}
          </h1>
          <p className="text-lg md:text-xl opacity-80 mb-10">{t(locale, "hero.subtitle")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/play"
              className="px-8 py-4 rounded-xl african-gradient text-white font-semibold text-lg shadow-lg hover:scale-105 transition-transform"
            >
              {t(locale, "hero.play")}
            </Link>
            <Link
              href="/puzzles"
              className="px-8 py-4 rounded-xl border-2 border-africhess-gold text-africhess-gold font-semibold text-lg hover:bg-africhess-gold/10 transition-colors"
            >
              {t(locale, "hero.puzzles")}
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-4xl mx-auto">
          {["bullet", "blitz", "rapid"].map((mode) => (
            <Link
              key={mode}
              href={`/play?mode=${mode}`}
              className="glass-card p-6 text-center hover:ring-2 hover:ring-africhess-gold/50 transition-all"
            >
              <p className="font-display text-2xl font-bold text-africhess-gold capitalize">
                {t(locale, `modes.${mode}`)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <Icon className="w-10 h-10 text-africhess-green mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
              <p className="opacity-70 text-sm">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
