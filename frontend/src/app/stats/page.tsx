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
          Connectez-vous pour voir vos statistiques
        </Link>
      </div>
    );
  }

  const username = user.username;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Statistiques</h1>
          <p className="opacity-60 text-sm mt-1">
            {user.display_name || user.username} — diagrammes, tableaux et exports
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
            ← Profil
          </Link>
        </div>
      </div>

      {error && <InlineAlert>{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60">Chargement…</p>}

      {data && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Parties" value={data.summary.games_played} accent="gold" />
            <StatCard
              label="Victoires"
              value={`${data.summary.win_rate}%`}
              sub={`${data.summary.games_won} V · ${data.summary.games_drawn} N · ${data.summary.games_lost} D`}
              accent="green"
            />
            <StatCard
              label="Série actuelle"
              value={
                data.summary.current_streak > 0
                  ? `+${data.summary.current_streak}`
                  : data.summary.current_streak
              }
              sub={`Record : ${data.summary.best_win_streak}`}
            />
            <StatCard label="Temps de jeu" value={`${data.summary.total_play_time_hours}h`} />
            <StatCard label="Problèmes" value={data.summary.puzzles_solved} />
            <StatCard
              label="vs IA"
              value={data.ai_stats.games_vs_ai}
              sub={
                data.ai_stats.best_ai_elo_beaten
                  ? `Meilleure IA : ${data.ai_stats.best_ai_elo_beaten}`
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
              Diagrammes
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
              Tableaux
            </button>
          </div>

          {activeTab === "charts" && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">Répartition V / N / D</h2>
                  <DonutChart
                    centerLabel={`${data.summary.win_rate}%`}
                    centerSub="victoires"
                    slices={[
                      { label: "Victoires", value: data.summary.games_won, color: CHART_COLORS.win },
                      { label: "Nulles", value: data.summary.games_drawn, color: CHART_COLORS.draw },
                      { label: "Défaites", value: data.summary.games_lost, color: CHART_COLORS.loss },
                    ]}
                  />
                </div>

                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">Par cadence</h2>
                  {data.by_mode.length === 0 ? (
                    <p className="text-sm opacity-50">Aucune partie.</p>
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
                  <h2 className="font-semibold mb-4">Humain vs IA</h2>
                  <BarChart
                    items={[
                      {
                        label: "En ligne",
                        value: data.vs_opponent.human.played,
                        color: CHART_COLORS.green,
                      },
                      {
                        label: "IA",
                        value: data.vs_opponent.ai.played,
                        color: CHART_COLORS.terracotta,
                      },
                    ]}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="opacity-50">En ligne</p>
                      <p className="font-mono text-africhess-green">
                        {data.vs_opponent.human.win_rate}%
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="opacity-50">IA</p>
                      <p className="font-mono text-africhess-gold">{data.vs_opponent.ai.win_rate}%</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">Activité — 30 jours</h2>
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
                  <h2 className="font-semibold mb-4">Fins de partie</h2>
                  <HorizontalBarChart
                    items={Object.entries(data.by_termination).map(([k, v]) => ({
                      label: TERMINATION_LABELS[k] ?? k,
                      value: v,
                      color: CHART_COLORS.blue,
                    }))}
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4">Top ouvertures</h2>
                  {data.openings.length === 0 ? (
                    <p className="text-sm opacity-50">Pas encore d&apos;ouvertures.</p>
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
                  <h2 className="font-semibold mb-4">Blancs vs Noirs</h2>
                  <DonutChart
                    slices={[
                      {
                        label: `Blancs (${data.by_color.white.win_rate}%)`,
                        value: data.by_color.white.played,
                        color: "#f5f5f5",
                      },
                      {
                        label: `Noirs (${data.by_color.black.win_rate}%)`,
                        value: data.by_color.black.played,
                        color: "#374151",
                      },
                    ]}
                  />
                </div>
              </section>

              {eloLinePoints.length >= 2 && (
                <section className="glass-card p-5">
                  <h2 className="font-semibold mb-2">Évolution ELO (parties en ligne)</h2>
                  <p className="text-xs opacity-50 mb-4">Historique des changements de classement</p>
                  <LineChart points={eloLinePoints} />
                </section>
              )}

              {data.recent_form.length > 0 && (
                <section className="glass-card p-5">
                  <h2 className="font-semibold mb-4">Forme récente</h2>
                  <FormSparkline
                    outcomes={data.recent_form.slice(0, 20).map((g) => g.outcome)}
                  />
                  <p className="text-xs opacity-40 mt-3">
                    Dernières {Math.min(20, data.recent_form.length)} parties — V victoire, D défaite, N
                    nulle
                  </p>
                </section>
              )}
            </>
          )}

          {activeTab === "tables" && (
            <>
              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">Résumé général</h2>
                <DataTable
                  caption="Indicateurs clés de performance"
                  columns={[
                    { key: "label", label: "Indicateur" },
                    { key: "value", label: "Valeur", className: "font-mono text-right" },
                  ]}
                  rows={[
                    { label: "Parties jouées", value: data.summary.games_played },
                    { label: "Victoires", value: data.summary.games_won },
                    { label: "Nulles", value: data.summary.games_drawn },
                    { label: "Défaites", value: data.summary.games_lost },
                    { label: "Taux de victoire", value: `${data.summary.win_rate}%` },
                    { label: "Série actuelle", value: data.summary.current_streak },
                    { label: "Meilleure série", value: data.summary.best_win_streak },
                    { label: "Temps de jeu (h)", value: data.summary.total_play_time_hours },
                    { label: "Problèmes résolus", value: data.summary.puzzles_solved },
                    { label: "Parties vs IA", value: data.ai_stats.games_vs_ai },
                    {
                      label: "Meilleure IA battue",
                      value: data.ai_stats.best_ai_elo_beaten ?? "—",
                    },
                  ]}
                />
              </section>

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">Par cadence</h2>
                <DataTable
                  columns={[
                    { key: "mode", label: "Cadence", className: "capitalize" },
                    { key: "played", label: "Jouées", className: "font-mono" },
                    { key: "won", label: "V", className: "font-mono text-africhess-green" },
                    { key: "drawn", label: "N", className: "font-mono" },
                    { key: "lost", label: "D", className: "font-mono text-africhess-terracotta" },
                    {
                      key: "win_rate",
                      label: "Win %",
                      className: "font-mono text-africhess-gold",
                      render: (r) => `${r.win_rate}%`,
                    },
                  ]}
                  rows={data.by_mode}
                  emptyMessage="Aucune partie par cadence."
                />
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="glass-card p-5 space-y-4">
                  <h2 className="font-semibold">Adversaire & couleur</h2>
                  <DataTable
                    caption="Performance par type d'adversaire"
                    columns={[
                      { key: "type", label: "Type" },
                      { key: "played", label: "Jouées", className: "font-mono" },
                      { key: "won", label: "V", className: "font-mono" },
                      { key: "drawn", label: "N", className: "font-mono" },
                      { key: "lost", label: "D", className: "font-mono" },
                      {
                        key: "win_rate",
                        label: "Win %",
                        render: (r) => `${r.win_rate}%`,
                        className: "font-mono",
                      },
                    ]}
                    rows={[
                      { type: "Joueurs en ligne", ...data.vs_opponent.human },
                      { type: "Ordinateur", ...data.vs_opponent.ai },
                      { type: "Blancs", ...data.by_color.white },
                      { type: "Noirs", ...data.by_color.black },
                    ]}
                  />
                </div>

                <div className="glass-card p-5 space-y-4">
                  <h2 className="font-semibold">Classements ELO</h2>
                  <DataTable
                    columns={[
                      { key: "mode", label: "Mode", className: "capitalize" },
                      { key: "elo", label: "ELO", className: "font-mono text-africhess-gold" },
                      { key: "peak_elo", label: "Pic", className: "font-mono opacity-60" },
                      { key: "games_count", label: "Parties", className: "font-mono" },
                    ]}
                    rows={data.ratings}
                    emptyMessage="Pas de classement."
                  />
                </div>
              </section>

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">Ouvertures</h2>
                <DataTable
                  columns={[
                    { key: "name", label: "Ouverture" },
                    { key: "played", label: "Jouées", className: "font-mono" },
                    { key: "won", label: "Victoires", className: "font-mono text-africhess-green" },
                    {
                      key: "win_rate",
                      label: "Win %",
                      className: "font-mono",
                      render: (r) => `${r.win_rate}%`,
                    },
                  ]}
                  rows={data.openings}
                  emptyMessage="Aucune ouverture enregistrée."
                />
              </section>

              {data.rating_history.length > 0 && (
                <section className="glass-card p-5 space-y-4">
                  <h2 className="font-semibold">Historique ELO</h2>
                  <DataTable
                    caption={`${data.rating_history.length} changements de classement`}
                    columns={[
                      {
                        key: "created_at",
                        label: "Date",
                        render: (r) =>
                          new Date(r.created_at as string).toLocaleDateString("fr-FR"),
                      },
                      { key: "mode", label: "Mode", className: "capitalize" },
                      { key: "elo_before", label: "Avant", className: "font-mono" },
                      { key: "elo_after", label: "Après", className: "font-mono" },
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
                <h2 className="font-semibold">Parties récentes</h2>
                <DataTable
                  columns={[
                    {
                      key: "date",
                      label: "Date",
                      render: (r) =>
                        new Date(r.date as string).toLocaleDateString("fr-FR"),
                    },
                    { key: "opponent", label: "Adversaire" },
                    { key: "mode", label: "Cadence", className: "capitalize" },
                    { key: "opening", label: "Ouverture" },
                    { key: "move_count", label: "Coups", className: "font-mono" },
                    {
                      key: "outcome",
                      label: "Résultat",
                      render: (r) => {
                        const o = r.outcome as string;
                        const label = o === "win" ? "Victoire" : o === "loss" ? "Défaite" : "Nulle";
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
                          Replay
                        </Link>
                      ),
                    },
                  ]}
                  rows={data.recent_form}
                  emptyMessage="Aucune partie récente."
                />
              </section>

              <section className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">Activité (30 jours)</h2>
                <DataTable
                  columns={[
                    { key: "date", label: "Date" },
                    { key: "games", label: "Parties", className: "font-mono" },
                  ]}
                  rows={data.activity.filter((a) => a.games > 0)}
                  emptyMessage="Aucune activité sur cette période."
                />
              </section>
            </>
          )}

          <section className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm opacity-60">
              Téléchargez toutes vos données pour analyse externe (Excel, Google Sheets…)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadStatsCsv(data, username)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg african-gradient text-white text-sm"
              >
                <Download size={14} />
                Télécharger CSV
              </button>
              <button
                type="button"
                onClick={() => downloadStatsJson(data, username)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm hover:bg-white/5"
              >
                <FileJson size={14} />
                Télécharger JSON
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
