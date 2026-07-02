"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { DeepReviewData } from "@/lib/gameAnalysis";

interface DeepReviewPanelProps {
  deep: DeepReviewData | null | undefined;
  locale?: "fr" | "en";
}

export function DeepReviewPanel({ deep, locale }: DeepReviewPanelProps) {
  const { locale: appLocale } = useTranslation();
  const lang = locale ?? (appLocale === "fr" ? "fr" : "en");

  if (!deep || !deep.coaching_plan_fr) {
    return null;
  }

  const plan = lang === "fr" ? deep.coaching_plan_fr : deep.coaching_plan_en;
  const phases = ["opening", "middlegame", "endgame"] as const;

  return (
    <div className="glass-card p-4 space-y-4 border border-africhess-gold/20">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-africhess-gold">
          {lang === "fr" ? "Coach IA — analyse profonde" : "AI Coach — deep review"}
        </h3>
        {deep.analysis_depth ? (
          <span className="text-xs opacity-60">
            Stockfish d{deep.analysis_depth}
          </span>
        ) : null}
      </div>

      {plan ? (
        <p className="text-sm leading-relaxed opacity-90">{plan}</p>
      ) : null}

      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        {phases.map((phase) => {
          const row = deep.phase_report?.[phase];
          if (!row?.summary_fr) return null;
          const label =
            lang === "fr"
              ? { opening: "Ouverture", middlegame: "Milieu", endgame: "Finale" }[phase]
              : phase;
          const summary = lang === "fr" ? row.summary_fr : row.summary_en;
          return (
            <div
              key={phase}
              className="rounded-lg bg-white/5 border border-white/10 p-2"
            >
              <div className="font-medium text-africhess-gold mb-1">{label}</div>
              <div className="opacity-80">{summary}</div>
            </div>
          );
        })}
      </div>

      {deep.turning_points && deep.turning_points.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium mb-2 opacity-80">
            {lang === "fr" ? "Moments décisifs" : "Turning points"}
          </h4>
          <ul className="space-y-1 text-sm opacity-90 max-h-36 overflow-y-auto">
            {deep.turning_points.map((tp) => (
              <li key={tp.ply} className="border-l-2 border-africhess-terracotta pl-2">
                {lang === "fr" ? tp.text_fr : tp.text_en}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {deep.integrity_flags && deep.integrity_flags.length > 0 ? (
        <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-3 text-xs">
          <div className="font-medium text-amber-200 mb-1">AIE — intégrité</div>
          <ul className="space-y-1 opacity-90">
            {deep.integrity_flags.map((f) => (
              <li key={f.code}>{lang === "fr" ? f.text_fr : f.text_en}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
