"use client";

import Link from "next/link";
import { Bot, ChevronRight, Clock, Swords, User } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useInView } from "@/hooks/useInView";
import { formatLocaleDate, modeLabel, terminationLabel } from "@/lib/i18n/labels";

export interface StatsGameRow {
  id: string;
  outcome: string;
  mode: string;
  opponent: string;
  opening: string;
  move_count: number;
  date: string;
  is_vs_ai: boolean;
  result?: string;
  termination?: string;
}

const OUTCOME_STYLES: Record<string, { bg: string; border: string; text: string; labelKey: string }> = {
  win: {
    bg: "rgba(45, 106, 79, 0.2)",
    border: "rgba(45, 106, 79, 0.55)",
    text: "#6ee7a8",
    labelKey: "play.recent.win",
  },
  loss: {
    bg: "rgba(196, 92, 62, 0.18)",
    border: "rgba(196, 92, 62, 0.5)",
    text: "#f0a08a",
    labelKey: "play.recent.loss",
  },
  draw: {
    bg: "rgba(107, 114, 128, 0.2)",
    border: "rgba(107, 114, 128, 0.45)",
    text: "#d1d5db",
    labelKey: "play.recent.draw",
  },
};

function outcomeStyle(outcome: string) {
  return OUTCOME_STYLES[outcome] ?? OUTCOME_STYLES.draw;
}

export function StatsGameHistory({ games }: { games: StatsGameRow[] }) {
  const { t, locale } = useTranslation();
  const { ref, inView } = useInView();

  if (games.length === 0) {
    return (
      <p className="text-sm opacity-50 text-center py-10">{t("stats.table.noRecent")}</p>
    );
  }

  return (
    <div ref={ref} className="space-y-2 max-h-[min(70vh,560px)] overflow-y-auto pr-1 stats-fx-history-scroll">
      {games.map((g, i) => {
        const style = outcomeStyle(g.outcome);
        const when = formatLocaleDate(locale, g.date, {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Link
            key={g.id}
            href={`/watch/${g.id}`}
            className={`stats-fx-history-row group ${inView ? "stats-fx-history-visible" : ""}`}
            style={{ animationDelay: `${Math.min(i, 20) * 50}ms` }}
          >
            <div
              className="stats-fx-history-badge shrink-0"
              style={{
                background: style.bg,
                borderColor: style.border,
                color: style.text,
                boxShadow: `0 0 14px ${style.border}`,
              }}
            >
              {t(style.labelKey).charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm font-medium truncate">{g.opponent}</span>
                <span className="stats-fx-mode-chip capitalize">{modeLabel(t, g.mode)}</span>
                {g.is_vs_ai && (
                  <span className="stats-fx-ai-chip">
                    <Bot className="w-3 h-3" aria-hidden />
                    IA
                  </span>
                )}
              </div>
              <p className="text-xs opacity-50 truncate">
                {g.opening}
                {g.termination ? ` · ${terminationLabel(t, g.termination)}` : ""}
              </p>
            </div>

            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-xs opacity-45">{when}</p>
              <p className="text-[10px] font-mono opacity-35 mt-0.5 flex items-center justify-end gap-1">
                <Swords className="w-3 h-3" aria-hidden />
                {g.move_count}
              </p>
            </div>

            <ChevronRight
              className="w-4 h-4 opacity-30 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all shrink-0"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}

export function StatsHistorySummary({ games }: { games: StatsGameRow[] }) {
  const { t } = useTranslation();
  const wins = games.filter((g) => g.outcome === "win").length;
  const losses = games.filter((g) => g.outcome === "loss").length;
  const draws = games.filter((g) => g.outcome === "draw").length;
  const vsHuman = games.filter((g) => !g.is_vs_ai).length;
  const vsAi = games.length - vsHuman;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {[
        { icon: User, label: t("stats.history.vsHuman"), value: vsHuman, color: "#6ee7a8" },
        { icon: Bot, label: t("stats.chart.ai"), value: vsAi, color: "#d4a843" },
        { icon: Swords, label: t("stats.chart.victories"), value: wins, color: "#2d6a4f" },
        { icon: Clock, label: t("stats.history.listed"), value: games.length, color: "#60a5fa" },
      ].map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="stats-fx-history-mini">
          <Icon className="w-3.5 h-3.5 opacity-50" style={{ color }} aria-hidden />
          <span className="font-mono font-bold text-sm" style={{ color }}>
            {value}
          </span>
          <span className="text-[10px] opacity-45 truncate">{label}</span>
        </div>
      ))}
      <div className="col-span-2 sm:col-span-4 text-[10px] opacity-40 text-center font-mono">
        {wins}V · {draws}N · {losses}D
      </div>
    </div>
  );
}
