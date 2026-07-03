"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { DeepReviewData } from "@/lib/gameAnalysis";
import type { Locale } from "@/lib/i18n";

interface DeepReviewPanelProps {
  deep: DeepReviewData | null | undefined;
}

function pickLocalizedText(
  locale: Locale,
  fr?: string | null,
  en?: string | null
): string | null {
  if (locale === "fr") return fr || en || null;
  return en || fr || null;
}

export function DeepReviewPanel({ deep }: DeepReviewPanelProps) {
  const { t, locale } = useTranslation();

  if (!deep || (!deep.coaching_plan_fr && !deep.coaching_plan_en)) {
    return null;
  }

  const plan = pickLocalizedText(locale, deep.coaching_plan_fr, deep.coaching_plan_en);
  const phases = ["opening", "middlegame", "endgame"] as const;
  const phaseKeys = {
    opening: "chess.review.phase.opening",
    middlegame: "chess.review.phase.middlegame",
    endgame: "chess.review.phase.endgame",
  } as const;

  return (
    <div className="glass-card p-4 space-y-4 border border-africhess-gold/20">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-africhess-gold">{t("chess.review.deep.title")}</h3>
        {deep.analysis_depth ? (
          <span className="text-xs opacity-60">
            {t("chess.review.deep.depth", { depth: deep.analysis_depth })}
          </span>
        ) : null}
      </div>

      {plan ? <p className="text-sm leading-relaxed opacity-90">{plan}</p> : null}

      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        {phases.map((phase) => {
          const row = deep.phase_report?.[phase];
          if (!row?.summary_fr && !row?.summary_en) return null;
          const summary = pickLocalizedText(locale, row.summary_fr, row.summary_en);
          if (!summary) return null;
          return (
            <div
              key={phase}
              className="rounded-lg bg-white/5 border border-white/10 p-2"
            >
              <div className="font-medium text-africhess-gold mb-1">{t(phaseKeys[phase])}</div>
              <div className="opacity-80">{summary}</div>
            </div>
          );
        })}
      </div>

      {deep.turning_points && deep.turning_points.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium mb-2 opacity-80">
            {t("chess.review.deep.turningPoints")}
          </h4>
          <ul className="space-y-1 text-sm opacity-90 max-h-36 overflow-y-auto">
            {deep.turning_points.map((tp) => (
              <li key={tp.ply} className="border-l-2 border-africhess-terracotta pl-2">
                {pickLocalizedText(locale, tp.text_fr, tp.text_en)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {deep.integrity_flags && deep.integrity_flags.length > 0 ? (
        <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-3 text-xs">
          <div className="font-medium text-amber-200 mb-1">{t("chess.review.deep.integrity")}</div>
          <ul className="space-y-1 opacity-90">
            {deep.integrity_flags.map((f) => (
              <li key={f.code}>{pickLocalizedText(locale, f.text_fr, f.text_en)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
