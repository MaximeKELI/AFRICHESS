"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Download, FileJson, Table2 } from "lucide-react";
import { statsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import {
  BarChart,
  CHART_COLORS,
  DonutChart,
  FormSparkline,
  HorizontalBarChart,
  LineChart,
} from "@/components/stats/StatsCharts";
import { DataTable } from "@/components/stats/StatsTables";
import { downloadStatsCsv, downloadStatsJson } from "@/lib/statsExport";
import { useTranslation } from "@/hooks/useTranslation";
import { formatLocaleDate, terminationLabel } from "@/lib/i18n/labels";

interface ModeBucket {
  mode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  win_rate: number;
}

interface OpponentBucket {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  win_rate: number;
}

interface StatsPayload {
  summary: {
    games_played: number;
    games_won: number;
    games_drawn: number;
    games_lost: number;
    win_rate: number;
    current_streak: number;
    best_win_streak: number;
    total_play_time_hours: number;
    puzzles_solved: number;
  };
  by_mode: ModeBucket[];
  vs_opponent: { human: OpponentBucket; ai: OpponentBucket };
  by_color: { white: OpponentBucket; black: OpponentBucket };
  by_termination: Record<string, number>;
  openings: { name: string; played: number; won: number; win_rate: number }[];
  recent_form: {
    id: string;
    outcome: string;
    mode: string;
    opponent: string;
    opening: string;
    move_count: number;
    date: string;
    is_vs_ai: boolean;
  }[];
  ratings: { mode: string; elo: number; peak_elo: number; games_count: number }[];
  rating_history: {
    mode: string;
    elo_before: number;
    elo_after: number;
    change: number;
    created_at: string;
  }[];
  activity: { date: string; games: number }[];
  analysis: {
    games_analyzed: number;
    avg_accuracy: number | null;
    avg_blunders: number | null;
  };
  ai_stats: {
    games_vs_ai: number;
    avg_ai_elo_beaten: number | null;
    best_ai_elo_beaten: number | null;
  };
}

const MODE_COLORS: Record<string, string> = {
  bullet: "#ef4444",
  blitz: CHART_COLORS.gold,
  rapid: "#3b82f6",
  classical: "#8b5cf6",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "gold" | "green";
}) {
  const color = accent === "green" ? "text-africhess-green" : "text-africhess-gold";
  return (
    <div className="glass-card p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm opacity-60">{label}</p>
      {sub && <p className="text-[10px] opacity-40 mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"charts" | "tables">("charts");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    statsApi
      .me()
      .then(({ data: d }) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("stats.error.load"))))
      .finally(() => setLoading(false));
  }, [user, t]);

  const eloLinePoints = useMemo(() => {
    if (!data?.rating_history.length) return [];
    const sorted = [...data.rating_history].reverse();
    return sorted.map((h) => ({
      x: formatLocaleDate(locale, h.created_at, { day: "2-digit", month: "short" }),
      y: h.elo_after,
    }));
  }, [data?.rating_history, locale]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Link href="/login" className="text-africhess-gold underline">
          {t("stats.loginRequired")}
        </Link>
      </div>
    );
  }

  const username = user.username;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("stats.title")}</h1>
          <p className="opacity-60 text-sm mt-1">
            {t("stats.subtitle", { name: user.display_name || user.username })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data && (
            <>
              <button
                type="button"
                onClick={() => downloadStatsCsv(data, username)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-africhess-gold/50 text-africhess-gold text-sm hover:bg-africhess-gold/10"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                type="button"
                onClick={() => downloadStatsJson(data, username)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/5"
              >
                <FileJson size={14} />
                JSON
              </button>
            </>
          )}
          <Link href="/profile" className="text-sm text-africhess-gold hover:underline px-2">
            {t("stats.backProfile")}
          </Link>
        </div>
      </div>

      {error && <InlineAlert>{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60">{t("common.loading")}</p>}

      {data && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label={t("stats.card.games")} value={data.summary.games_played} accent="gold" />
            <StatCard
              label={t("stats.card.wins")}
              value={`${data.summary.win_rate}%`}
              sub={t("stats.summary.wdl", {
                w: data.summary.games_won,
                d: data.summary.games_drawn,
                l: data.summary.games_lost,
              })}
              accent="green"
            />
            <StatCard
              label={t("stats.card.streak")}
              value={
                data.summary.current_streak > 0
                  ? `+${data.summary.current_streak}`
                  : data.summary.current_streak
              }
              sub={t("stats.card.streakRecord", { n: data.summary.best_win_streak })}
            />
            <StatCard label={t("stats.card.playTime")} value={`${data.summary.total_play_time_hours}h`} />
            <StatCard label={t("stats.card.puzzles")} value={data.summary.puzzles_solved} />
            <StatCard
              label={t("stats.card.vsAi")}
              value={data.ai_stats.games_vs_ai}
              sub={
                data.ai_stats.best_ai_elo_beaten
                  ? t("stats.card.bestAi", { elo: data.ai_stats.best_ai_elo_beaten })
                  : undefined
              }
            />
          </section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("charts")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm ${
                activeTab === "charts"
                  ? "african-gradient text-white"
                  : "border border-white/15 hover:bg-white/5"
              }`}
            >
              <BarChart3 size={14} />
              {t("stats.tabs.charts")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tables")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm ${
                activeTab === "tables"
                  ? "african-gradient text-white"
                  : "border border-white/15 hover:bg-white/5"
              }`}
            >
              <Table2 size={14} />
              {t("stats.tabs.tables")}
            </button>
          </div>

          {activeTab === "charts" && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.outcomes")}</h2>
                  <DonutChart
                    centerLabel={`${data.summary.win_rate}%`}
                    centerSub={t("stats.chart.wins")}
                    slices={[
                      { label: t("stats.chart.victories"), value: data.summary.games_won, color: CHART_COLORS.win },
                      { label: t("stats.chart.draws"), value: data.summary.games_drawn, color: CHART_COLORS.draw },
                      { label: t("stats.chart.losses"), value: data.summary.games_lost, color: CHART_COLORS.loss },
                    ]}
                  />
                </div>

                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.byMode")}</h2>
                  {data.by_mode.length === 0 ? (
                    <p className="text-sm opacity-50">{t("stats.chart.noGames")}</p>
                  ) : (
                    <BarChart
                      items={data.by_mode.map((m) => ({
                        label: m.mode,
                        value: m.played,
                        color: MODE_COLORS[m.mode] ?? CHART_COLORS.gold,
                      }))}
                    />
                  )}
                </div>

                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.humanVsAi")}</h2>
                  <BarChart
                    items={[
                      {
                        label: t("stats.chart.online"),
                        value: data.vs_opponent.human.played,
                        color: CHART_COLORS.green,
                      },
                      {
                        label: t("stats.chart.ai"),
                        value: data.vs_opponent.ai.played,
                        color: CHART_COLORS.terracotta,
                      },
                    ]}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="opacity-50">{t("stats.chart.online")}</p>
                      <p className="font-mono text-africhess-green">
                        {data.vs_opponent.human.win_rate}%
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="opacity-50">{t("stats.chart.ai")}</p>
                      <p className="font-mono text-africhess-gold">{data.vs_opponent.ai.win_rate}%</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.activity")}</h2>
                  <BarChart
                    maxHeight={100}
                    items={data.activity.map((a) => ({
                      label: a.date.slice(8),
                      value: a.games,
                      color: CHART_COLORS.gold,
                    }))}
                  />
                </div>

                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.terminations")}</h2>
                  <HorizontalBarChart
                    items={Object.entries(data.by_termination).map(([k, v]) => ({
                      label: terminationLabel(t, k),
                      value: v,
                      color: CHART_COLORS.blue,
                    }))}
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.openings")}</h2>
                  {data.openings.length === 0 ? (
                    <p className="text-sm opacity-50">{t("stats.chart.noOpenings")}</p>
                  ) : (
                    <HorizontalBarChart
                      items={data.openings.slice(0, 8).map((o) => ({
                        label: o.name,
                        value: o.played,
                        sub: `${o.win_rate}%`,
                        color: CHART_COLORS.purple,
                      }))}
                    />
                  )}
                </div>

                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.colors")}</h2>
                  <DonutChart
                    slices={[
                      {
                        label: t("stats.chart.white", { rate: data.by_color.white.win_rate }),
                        value: data.by_color.white.played,
                        color: "#f5f5f5",
                      },
                      {
                        label: t("stats.chart.black", { rate: data.by_color.black.win_rate }),
                        value: data.by_color.black.played,
                        color: "#374151",
                      },
                    ]}
                  />
                </div>
              </section>

              {eloLinePoints.length >= 2 && (
                <section className="glass-card p-5">
                  <h2 className="font-semibold mb-2">{t("stats.chart.eloEvolution")}</h2>
                  <p className="text-xs opacity-50 mb-4">{t("stats.chart.eloHistory")}</p>
                  <LineChart points={eloLinePoints} />
                </section>
              )}

              {data.recent_form.length > 0 && (
                <section className="glass-card p-5">
                  <h2 className="font-semibold mb-4">{t("stats.chart.recentForm")}</h2>
                  <FormSparkline
                    outcomes={data.recent_form.slice(0, 20).map((g) => g.outcome)}
                  />
                  <p className="text-xs opacity-40 mt-3">
                    {t("stats.chart.recentFormHint", {
                      n: Math.min(20, data.recent_form.length),
                    })}
                  </p>
                </section>
              )}
            </>
          )}

          {activeTab === "tables" && (
            <>
              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">{t("stats.table.summary")}</h2>
                <DataTable
                  caption={t("stats.table.summaryCaption")}
                  columns={[
                    { key: "label", label: t("stats.table.indicator") },
                    { key: "value", label: t("stats.table.value"), className: "font-mono text-right" },
                  ]}
                  rows={[
                    { label: t("stats.table.gamesPlayed"), value: data.summary.games_played },
                    { label: t("stats.chart.victories"), value: data.summary.games_won },
                    { label: t("stats.chart.draws"), value: data.summary.games_drawn },
                    { label: t("stats.chart.losses"), value: data.summary.games_lost },
                    { label: t("stats.table.winRate"), value: `${data.summary.win_rate}%` },
                    { label: t("stats.table.currentStreak"), value: data.summary.current_streak },
                    { label: t("stats.table.bestStreak"), value: data.summary.best_win_streak },
                    { label: t("stats.table.playTimeH"), value: data.summary.total_play_time_hours },
                    { label: t("stats.table.puzzlesSolved"), value: data.summary.puzzles_solved },
                    { label: t("stats.table.gamesVsAi"), value: data.ai_stats.games_vs_ai },
                    {
                      label: t("stats.table.bestAiBeaten"),
                      value: data.ai_stats.best_ai_elo_beaten ?? "—",
                    },
                  ]}
                />
              </section>

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">{t("stats.table.byMode")}</h2>
                <DataTable
                  columns={[
                    { key: "mode", label: t("stats.table.pace"), className: "capitalize" },
                    { key: "played", label: t("stats.table.played"), className: "font-mono" },
                    { key: "won", label: t("stats.table.won"), className: "font-mono text-africhess-green" },
                    { key: "drawn", label: t("stats.table.drawn"), className: "font-mono" },
                    { key: "lost", label: t("stats.table.lost"), className: "font-mono text-africhess-terracotta" },
                    {
                      key: "win_rate",
                      label: t("stats.table.winPct"),
                      className: "font-mono text-africhess-gold",
                      render: (r) => `${r.win_rate}%`,
                    },
                  ]}
                  rows={data.by_mode}
                  emptyMessage={t("stats.table.noModeGames")}
                />
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5 space-y-4">
                  <h2 className="font-semibold">{t("stats.table.opponentColor")}</h2>
                  <DataTable
                    caption={t("stats.table.opponentCaption")}
                    columns={[
                      { key: "type", label: t("stats.table.type") },
                      { key: "played", label: t("stats.table.played"), className: "font-mono" },
                      { key: "won", label: t("stats.table.won"), className: "font-mono" },
                      { key: "drawn", label: t("stats.table.drawn"), className: "font-mono" },
                      { key: "lost", label: t("stats.table.lost"), className: "font-mono" },
                      {
                        key: "win_rate",
                        label: t("stats.table.winPct"),
                        render: (r) => `${r.win_rate}%`,
                        className: "font-mono",
                      },
                    ]}
                    rows={[
                      { type: t("stats.table.onlinePlayers"), ...data.vs_opponent.human },
                      { type: t("stats.table.computer"), ...data.vs_opponent.ai },
                      { type: t("stats.table.white"), ...data.by_color.white },
                      { type: t("stats.table.black"), ...data.by_color.black },
                    ]}
                  />
                </div>

                <div className="glass-card p-5 space-y-4">
                  <h2 className="font-semibold">{t("stats.table.eloRatings")}</h2>
                  <DataTable
                    columns={[
                      { key: "mode", label: t("stats.table.mode"), className: "capitalize" },
                      { key: "elo", label: t("leaderboard.col.elo"), className: "font-mono text-africhess-gold" },
                      { key: "peak_elo", label: t("stats.table.peak"), className: "font-mono opacity-60" },
                      { key: "games_count", label: t("stats.card.games"), className: "font-mono" },
                    ]}
                    rows={data.ratings}
                    emptyMessage={t("stats.table.noRating")}
                  />
                </div>
              </section>

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">{t("stats.table.openings")}</h2>
                <DataTable
                  columns={[
                    { key: "name", label: t("stats.table.opening") },
                    { key: "played", label: t("stats.table.played"), className: "font-mono" },
                    { key: "won", label: t("stats.chart.victories"), className: "font-mono text-africhess-green" },
                    {
                      key: "win_rate",
                      label: t("stats.table.winPct"),
                      className: "font-mono",
                      render: (r) => `${r.win_rate}%`,
                    },
                  ]}
                  rows={data.openings}
                  emptyMessage={t("stats.table.noOpeningData")}
                />
              </section>

              {data.rating_history.length > 0 && (
                <section className="glass-card p-5 space-y-4">
                  <h2 className="font-semibold">{t("stats.table.eloHistory")}</h2>
                  <DataTable
                    caption={t("stats.table.eloChanges", { n: data.rating_history.length })}
                    columns={[
                      {
                        key: "created_at",
                        label: t("stats.table.date"),
                        render: (r) => formatLocaleDate(locale, r.created_at as string),
                      },
                      { key: "mode", label: t("stats.table.mode"), className: "capitalize" },
                      { key: "elo_before", label: t("stats.table.before"), className: "font-mono" },
                      { key: "elo_after", label: t("stats.table.after"), className: "font-mono" },
                      {
                        key: "change",
                        label: "Δ",
                        className: "font-mono",
                        render: (r) => {
                          const c = r.change as number;
                          const cls =
                            c > 0
                              ? "text-africhess-green"
                              : c < 0
                                ? "text-africhess-terracotta"
                                : "";
                          return <span className={cls}>{c > 0 ? `+${c}` : c}</span>;
                        },
                      },
                    ]}
                    rows={data.rating_history}
                  />
                </section>
              )}

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">{t("stats.table.recentGames")}</h2>
                <DataTable
                  columns={[
                    {
                      key: "date",
                      label: t("stats.table.date"),
                      render: (r) => formatLocaleDate(locale, r.date as string),
                    },
                    { key: "opponent", label: t("stats.table.opponent") },
                    { key: "mode", label: t("stats.table.pace"), className: "capitalize" },
                    { key: "opening", label: t("stats.table.opening") },
                    { key: "move_count", label: t("stats.table.moves"), className: "font-mono" },
                    {
                      key: "outcome",
                      label: t("stats.table.result"),
                      render: (r) => {
                        const o = r.outcome as string;
                        const label =
                          o === "win"
                            ? t("play.recent.win")
                            : o === "loss"
                              ? t("play.recent.loss")
                              : t("play.recent.draw");
                        const cls =
                          o === "win"
                            ? "text-africhess-green"
                            : o === "loss"
                              ? "text-africhess-terracotta"
                              : "";
                        return <span className={cls}>{label}</span>;
                      },
                    },
                    {
                      key: "id",
                      label: "",
                      render: (r) => (
                        <Link
                          href={`/watch/${r.id}`}
                          className="text-africhess-gold text-xs hover:underline"
                        >
                          {t("stats.table.replay")}
                        </Link>
                      ),
                    },
                  ]}
                  rows={data.recent_form}
                  emptyMessage={t("stats.table.noRecent")}
                />
              </section>

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">{t("stats.table.activity30")}</h2>
                <DataTable
                  columns={[
                    { key: "date", label: t("stats.table.date") },
                    { key: "games", label: t("stats.card.games"), className: "font-mono" },
                  ]}
                  rows={data.activity.filter((a) => a.games > 0)}
                  emptyMessage={t("stats.table.noActivity")}
                />
              </section>
            </>
          )}

          <section className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm opacity-60">{t("stats.export.hint")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadStatsCsv(data, username)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg african-gradient text-white text-sm"
              >
                <Download size={14} />
                {t("stats.export.csv")}
              </button>
              <button
                type="button"
                onClick={() => downloadStatsJson(data, username)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm hover:bg-white/5"
              >
                <FileJson size={14} />
                {t("stats.export.json")}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
