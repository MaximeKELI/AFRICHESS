"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

const TRAINING_MODES = [
  {
    href: "/puzzles",
    titleKey: "training.hub.puzzles.title",
    descKey: "training.hub.puzzles.desc",
    accent: "text-africhess-gold",
  },
  {
    href: "/training/vision",
    titleKey: "training.hub.vision.title",
    descKey: "training.hub.vision.desc",
    accent: "text-africhess-green",
  },
  {
    href: "/training/endgames",
    titleKey: "training.hub.endgames.title",
    descKey: "training.hub.endgames.desc",
    accent: "text-africhess-terracotta",
  },
  {
    href: "/training/solo",
    titleKey: "training.hub.solo.title",
    descKey: "training.hub.solo.desc",
    accent: "text-white",
  },
  {
    href: "/puzzles/build",
    titleKey: "training.hub.build.title",
    descKey: "training.hub.build.desc",
    accent: "text-africhess-gold",
  },
] as const;

export default function TrainingHubPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-2">{t("training.hub.title")}</h1>
      <p className="opacity-70 mb-8">{t("training.hub.subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {TRAINING_MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="glass-card p-6 hover:border-africhess-gold/40 transition-colors block"
          >
            <h2 className={`font-semibold text-lg mb-2 ${mode.accent}`}>{t(mode.titleKey)}</h2>
            <p className="text-sm opacity-70">{t(mode.descKey)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
