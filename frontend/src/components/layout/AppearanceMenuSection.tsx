"use client";

import { BackgroundPicker } from "@/components/chess/BackgroundPicker";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";

/** Arrière-plan & apparence dans le menu latéral. */
export function AppearanceMenuSection({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider opacity-50">
          {t("play.options.appearance")}
        </p>
        <Link
          href="/play?setup=appearance"
          onClick={onNavigate}
          className="text-[10px] text-africhess-gold hover:underline"
        >
          {t("nav.appearance.all")}
        </Link>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-3 max-h-[min(50vh,320px)] overflow-y-auto scrollbar-thin">
        <BackgroundPicker compact showHeader={false} />
      </div>
    </div>
  );
}
