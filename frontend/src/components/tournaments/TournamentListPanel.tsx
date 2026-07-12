"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { tournamentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export interface StandingRow {
  user: { id: number; username: string; display_name?: string };
  score: number;
  wins: number;
  draws: number;
  losses: number;
  games_played: number;
}

export interface TournamentItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  format: string;
  status: string;
  mode: string;
  max_players: number;
  participant_count: number;
  is_african_cup: boolean;
  prize_pool: string;
  starts_at: string;
  country: string;
  club_a?: number | null;
  club_b?: number | null;
  club_a_name?: string | null;
  club_b_name?: string | null;
  created_by?: { id: number; username: string };
  standings?: StandingRow[];
}

interface TeamScoreRow {
  club_name: string;
  club_slug: string;
  score: number;
  wins: number;
  members: number;
}

export interface TournamentListPanelProps {
  /** Filtre backend format=arena|swiss|… ; omit = tous */
  format?: string;
  titleKey: string;
  subtitleKey: string;
  showAfricanFilter?: boolean;
}

export function TournamentListPanel({
  format,
  titleKey,
  subtitleKey,
  showAfricanFilter = true,
}: TournamentListPanelProps) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [list, setList] = useState<TournamentItem[]>([]);
  const [africanOnly, setAfricanOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScoreRow[]>([]);

  const load = useCallback(() => {
    tournamentsApi.list({ african: africanOnly, format }).then(({ data }) => {
      setList(Array.isArray(data) ? data : data.results ?? []);
    });
  }, [africanOnly, format]);

  useEffect(() => {
    load();
  }, [load]);

  const register = async (slug: string, clubId?: number) => {
    if (!user) {
      setStatus(t("tournaments.status.loginRequired"));
      return;
    }
    setStatus("");
    try {
      await tournamentsApi.register(slug, clubId);
      setStatus(t("tournaments.status.registered"));
      load();
    } catch {
      setStatus(t("tournaments.status.registerFailed"));
    }
  };

  const withdraw = async (slug: string) => {
    if (!user) return;
    try {
      await tournamentsApi.withdraw(slug);
      setStatus(t("tournaments.status.withdrawn"));
      load();
    } catch {
      setStatus(t("tournaments.status.withdrawFailed"));
    }
  };

  const setPaused = async (slug: string, available: boolean) => {
    if (!user) return;
    try {
      await tournamentsApi.setAvailability(slug, available);
      setStatus(
        available ? t("tournaments.status.resumed") : t("tournaments.status.paused")
      );
    } catch {
      setStatus(t("tournaments.status.withdrawFailed"));
    }
  };

  const startTournament = async (slug: string) => {
    try {
      await tournamentsApi.start(slug);
      setStatus(t("tournaments.status.started"));
      load();
    } catch {
      setStatus(t("tournaments.status.startFailed"));
    }
  };

  const loadStandings = async (slug: string, fmt?: string) => {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      setTeamScores([]);
      return;
    }
    const { data } = await tournamentsApi.standings(slug);
    setStandings(Array.isArray(data) ? data : []);
    setExpandedSlug(slug);
    if (fmt === "team_battle") {
      const ts = await tournamentsApi.teamScores(slug);
      setTeamScores(ts.data?.teams ?? []);
    } else {
      setTeamScores([]);
    }
  };

  const openMyGame = async (slug: string) => {
    try {
      const { data } = await tournamentsApi.myGame(slug);
      if (data?.game?.id) {
        window.location.href = `/play?game=${data.game.id}`;
      } else {
        setStatus(t("tournaments.status.noActiveGame"));
      }
    } catch {
      setStatus(t("tournaments.status.findGameError"));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t(titleKey)}</h1>
      <p className="opacity-70 mb-6">{t(subtitleKey)}</p>

      {showAfricanFilter && (
        <label className="flex items-center gap-2 mb-6 text-sm">
          <input
            type="checkbox"
            checked={africanOnly}
            onChange={(e) => setAfricanOnly(e.target.checked)}
          />
          {t("tournaments.africanOnly")}
        </label>
      )}

      {status && <p className="text-africhess-gold mb-4">{status}</p>}

      <div className="space-y-4">
        {list.map((tournament) => (
          <article key={tournament.id} className="glass-card p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <h2 className="font-semibold text-lg">{tournament.name}</h2>
              {tournament.is_african_cup && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-africhess-gold/20">
                  {t("tournaments.africanCup")}
                </span>
              )}
            </div>
            <p className="text-sm opacity-80 mb-3">{tournament.description || "—"}</p>
            <div className="flex flex-wrap gap-3 text-xs opacity-70 mb-4">
              <span className="capitalize">{tournament.mode}</span>
              <span className="capitalize">{tournament.format.replace("_", " ")}</span>
              {tournament.format === "team_battle" &&
                tournament.club_a_name &&
                tournament.club_b_name && (
                  <span>
                    {tournament.club_a_name} vs {tournament.club_b_name}
                  </span>
                )}
              <span>
                {t("tournaments.players", {
                  current: tournament.participant_count,
                  max: tournament.max_players,
                })}
              </span>
              <span className="capitalize">{tournament.status}</span>
              {tournament.starts_at && (
                <span>{new Date(tournament.starts_at).toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {tournament.status === "registration" && user && (
                <>
                  {tournament.format === "team_battle" &&
                  tournament.club_a &&
                  tournament.club_b ? (
                    <>
                      <button
                        type="button"
                        onClick={() => register(tournament.slug, tournament.club_a!)}
                        className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
                      >
                        {t("tournaments.registerAs", {
                          club: tournament.club_a_name || "A",
                        })}
                      </button>
                      <button
                        type="button"
                        onClick={() => register(tournament.slug, tournament.club_b!)}
                        className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
                      >
                        {t("tournaments.registerAs", {
                          club: tournament.club_b_name || "B",
                        })}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => register(tournament.slug)}
                      className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
                    >
                      {t("tournaments.register")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => withdraw(tournament.slug)}
                    className="px-4 py-2 rounded-lg border border-white/20 text-sm"
                  >
                    {t("tournaments.withdraw")}
                  </button>
                </>
              )}
              {user &&
                tournament.created_by?.id === user.id &&
                (tournament.status === "registration" || tournament.status === "upcoming") && (
                  <button
                    type="button"
                    onClick={() => startTournament(tournament.slug)}
                    className="px-4 py-2 rounded-lg border border-africhess-green text-africhess-green text-sm"
                  >
                    {t("tournaments.start")}
                  </button>
                )}
              {tournament.status === "active" && user && (
                <>
                  <button
                    type="button"
                    onClick={() => openMyGame(tournament.slug)}
                    className="px-4 py-2 rounded-lg border text-sm"
                  >
                    {t("tournaments.myGame")}
                  </button>
                  {(tournament.format === "arena" ||
                    tournament.format === "club_arena" ||
                    tournament.format === "team_battle") && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaused(tournament.slug, false)}
                        className="px-4 py-2 rounded-lg border border-white/20 text-sm"
                      >
                        {t("tournaments.pause")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaused(tournament.slug, true)}
                        className="px-4 py-2 rounded-lg border border-white/20 text-sm"
                      >
                        {t("tournaments.resume")}
                      </button>
                    </>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => loadStandings(tournament.slug, tournament.format)}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm"
              >
                {expandedSlug === tournament.slug
                  ? t("tournaments.hideStandings")
                  : t("tournaments.showStandings")}
              </button>
            </div>

            {expandedSlug === tournament.slug && (
              <div className="mt-4 border-t border-white/10 pt-3 space-y-4">
                {teamScores.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{t("tournaments.teamScores")}</h3>
                    <ol className="text-sm space-y-1">
                      {teamScores.map((row, i) => (
                        <li key={row.club_slug} className="flex justify-between">
                          <span>
                            {i + 1}. {row.club_name}
                          </span>
                          <span className="opacity-70">
                            {row.score} pts · {row.members} {t("tournaments.members")}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {standings.length === 0 ? (
                  <p className="text-sm opacity-60">{t("tournaments.noResults")}</p>
                ) : (
                  <ol className="text-sm space-y-1">
                    {standings.map((row, i) => (
                      <li key={row.user.id} className="flex justify-between">
                        <span>
                          {i + 1}. {row.user.display_name || row.user.username}
                        </span>
                        <span className="opacity-70">
                          {row.score} pts ({row.wins}V {row.draws}N {row.losses}D)
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {!user && tournament.status === "registration" && (
              <Link
                href="/login"
                className="text-sm text-africhess-green hover:underline mt-2 inline-block"
              >
                {t("tournaments.loginToRegister")}
              </Link>
            )}
          </article>
        ))}
        {list.length === 0 && (
          <p className="opacity-60 text-center py-12">{t("tournaments.empty")}</p>
        )}
      </div>
    </div>
  );
}
