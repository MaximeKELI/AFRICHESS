"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { statsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";

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

const TERMINATION_LABELS: Record<string, string> = {
  resignation: "Abandon",
  timeout: "Temps écoulé",
  draw_agreement: "Nulle acceptée",
  repetition: "Répétition",
  checkmate: "Mat",
  disconnect: "Déconnexion",
  other: "Autre",
};

const OUTCOME_CLASS: Record<string, string> = {
  win: "bg-africhess-green/20 text-africhess-green",
  loss: "bg-africhess-terracotta/20 text-africhess-terracotta",
  draw: "bg-white/10 opacity-80",
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

function WdlBar({ won, drawn, lost }: { won: number; drawn: number; lost: number }) {
  const total = won + drawn + lost || 1;
  const wp = (won / total) * 100;
  const dp = (drawn / total) * 100;
  const lp = (lost / total) * 100;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
      <div className="bg-africhess-green" style={{ width: `${wp}%` }} />
      <div className="bg-white/30" style={{ width: `${dp}%` }} />
      <div className="bg-africhess-terracotta" style={{ width: `${lp}%` }} />
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    statsApi
      .me()
      .then(({ data: d }) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, "Impossible de charger les statistiques.")))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Link href="/login" className="text-africhess-gold underline">
          Connectez-vous pour voir vos statistiques
        </Link>
      </div>
    );
  }

  const maxActivity = Math.max(...(data?.activity.map((a) => a.games) ?? [1]), 1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Statistiques</h1>
          <p className="opacity-60 text-sm mt-1">
            {user.display_name || user.username} — parties, ouvertures, ELO et forme récente
          </p>
        </div>
        <Link href="/profile" className="text-sm text-africhess-gold hover:underline">
          ← Profil
        </Link>
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
              value={data.summary.current_streak > 0 ? `+${data.summary.current_streak}` : data.summary.current_streak}
              sub={`Record : ${data.summary.best_win_streak}`}
            />
            <StatCard
              label="Temps de jeu"
              value={`${data.summary.total_play_time_hours}h`}
            />
            <StatCard label="Problèmes" value={data.summary.puzzles_solved} />
            <StatCard
              label="vs IA"
              value={data.ai_stats.games_vs_ai}
              sub={
                data.ai_stats.best_ai_elo_beaten
                  ? `Meilleure IA battue : ${data.ai_stats.best_ai_elo_beaten}`
                  : undefined
              }
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-4">Par cadence</h2>
              {data.by_mode.length === 0 ? (
                <p className="text-sm opacity-50">Aucune partie terminée.</p>
              ) : (
                <div className="space-y-4">
                  {data.by_mode.map((m) => (
                    <div key={m.mode}>
                      <div className="flex justify-between text-sm mb-1 capitalize">
                        <span>{m.mode}</span>
                        <span className="font-mono text-africhess-gold">{m.win_rate}%</span>
                      </div>
                      <WdlBar won={m.won} drawn={m.drawn} lost={m.lost} />
                      <p className="text-[10px] opacity-45 mt-1">
                        {m.played} parties — {m.won}V {m.drawn}N {m.lost}D
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="font-semibold mb-4">Adversaire & couleur</h2>
              <div className="space-y-4">
                {(["human", "ai"] as const).map((key) => {
                  const b = data.vs_opponent[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{key === "human" ? "Joueurs en ligne" : "Ordinateur"}</span>
                        <span className="font-mono">{b.win_rate}%</span>
                      </div>
                      <WdlBar won={b.won} drawn={b.drawn} lost={b.lost} />
                      <p className="text-[10px] opacity-45 mt-1">{b.played} parties</p>
                    </div>
                  );
                })}
                <hr className="border-white/10" />
                {(["white", "black"] as const).map((key) => {
                  const b = data.by_color[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{key === "white" ? "Blancs" : "Noirs"}</span>
                        <span className="font-mono">{b.win_rate}%</span>
                      </div>
                      <WdlBar won={b.won} drawn={b.drawn} lost={b.lost} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="glass-card p-5 lg:col-span-2">
              <h2 className="font-semibold mb-4">Activité (30 jours)</h2>
              <div className="flex items-end gap-0.5 h-24">
                {data.activity.map((a) => (
                  <div
                    key={a.date}
                    className="flex-1 bg-africhess-gold/80 rounded-t min-h-[2px] transition-all"
                    style={{
                      height: `${Math.max(4, (a.games / maxActivity) * 100)}%`,
                      opacity: a.games ? 0.4 + (a.games / maxActivity) * 0.6 : 0.15,
                    }}
                    title={`${a.date} : ${a.games} partie(s)`}
                  />
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="font-semibold mb-4">Fins de partie</h2>
              <div className="space-y-2 text-sm">
                {Object.entries(data.by_termination).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="opacity-70">{TERMINATION_LABELS[k] ?? k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
                {Object.keys(data.by_termination).length === 0 && (
                  <p className="opacity-50 text-sm">—</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card p-5">
              <h2 className="font-semibold mb-4">Ouvertures jouées</h2>
              {data.openings.length === 0 ? (
                <p className="text-sm opacity-50">Jouez plus de coups d&apos;ouverture.</p>
              ) : (
                <div className="space-y-2">
                  {data.openings.map((o) => (
                    <div
                      key={o.name}
                      className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0"
                    >
                      <span className="truncate pr-2">{o.name}</span>
                      <span className="shrink-0 font-mono text-xs">
                        {o.played}× · {o.win_rate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="font-semibold mb-4">Classements ELO</h2>
              <div className="space-y-2">
                {data.ratings.map((r) => (
                  <div key={r.mode} className="flex justify-between text-sm capitalize">
                    <span>{r.mode}</span>
                    <span className="font-mono">
                      {r.elo}{" "}
                      <span className="opacity-40 text-xs">pic {r.peak_elo}</span>
                    </span>
                  </div>
                ))}
                {data.ratings.length === 0 && (
                  <p className="text-sm opacity-50">Pas encore de classement.</p>
                )}
              </div>
              {data.analysis.games_analyzed > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 text-sm">
                  <p className="font-medium mb-1">Qualité de jeu (analysées)</p>
                  <p className="opacity-70">
                    Précision moy. : {data.analysis.avg_accuracy ?? "—"}% · Erreurs graves :{" "}
                    {data.analysis.avg_blunders ?? "—"}
                  </p>
                  <p className="text-[10px] opacity-40">{data.analysis.games_analyzed} parties analysées</p>
                </div>
              )}
            </div>
          </section>

          {data.rating_history.length > 0 && (
            <section className="glass-card p-5">
              <h2 className="font-semibold mb-4">Historique ELO (parties en ligne)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left opacity-50 text-xs">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Mode</th>
                      <th className="pb-2">Avant</th>
                      <th className="pb-2">Après</th>
                      <th className="pb-2">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rating_history.slice(0, 15).map((h, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-2 opacity-70">
                          {new Date(h.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="capitalize">{h.mode}</td>
                        <td className="font-mono">{h.elo_before}</td>
                        <td className="font-mono">{h.elo_after}</td>
                        <td
                          className={`font-mono ${
                            h.change > 0 ? "text-africhess-green" : h.change < 0 ? "text-africhess-terracotta" : ""
                          }`}
                        >
                          {h.change > 0 ? `+${h.change}` : h.change}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="glass-card p-5">
            <h2 className="font-semibold mb-4">Forme récente</h2>
            {data.recent_form.length === 0 ? (
              <p className="text-sm opacity-50">
                <Link href="/play" className="text-africhess-gold underline">
                  Jouez votre première partie
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {data.recent_form.map((g) => (
                  <Link
                    key={g.id}
                    href={`/watch/${g.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-africhess-gold/40 hover:bg-white/5 transition-colors"
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        OUTCOME_CLASS[g.outcome] ?? "bg-white/10"
                      }`}
                    >
                      {g.outcome === "win" ? "V" : g.outcome === "loss" ? "D" : "N"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {g.opponent}
                        <span className="opacity-40 font-normal ml-1 capitalize">· {g.mode}</span>
                      </p>
                      <p className="text-xs opacity-50 truncate">
                        {g.opening} · {g.move_count} coups
                      </p>
                    </div>
                    <span className="text-[10px] opacity-40 shrink-0">
                      {new Date(g.date).toLocaleDateString("fr-FR")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
