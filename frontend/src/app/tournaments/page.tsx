"use client";

import { useCallback, useEffect, useState } from "react";
import { tournamentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface StandingRow {
  user: { id: number; username: string; display_name?: string };
  score: number;
  wins: number;
  draws: number;
  losses: number;
  games_played: number;
}

interface Tournament {
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
  created_by?: { id: number; username: string };
  standings?: StandingRow[];
}

export default function TournamentsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [list, setList] = useState<Tournament[]>([]);
  const [africanOnly, setAfricanOnly] = useState(true);
  const [status, setStatus] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);

  const load = useCallback(() => {
    tournamentsApi.list(africanOnly).then(({ data }) => {
      setList(Array.isArray(data) ? data : data.results ?? []);
    });
  }, [africanOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const register = async (slug: string) => {
    if (!user) {
      setStatus("Connectez-vous pour vous inscrire");
      return;
    }
    setStatus("");
    try {
      await tournamentsApi.register(slug);
      setStatus("Inscription confirmée !");
      load();
    } catch {
      setStatus("Inscription impossible (complet ou fermé)");
    }
  };

  const startTournament = async (slug: string) => {
    try {
      await tournamentsApi.start(slug);
      setStatus("Tournoi démarré — les parties sont créées");
      load();
    } catch {
      setStatus("Impossible de démarrer (droits ou participants insuffisants)");
    }
  };

  const loadStandings = async (slug: string) => {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      return;
    }
    const { data } = await tournamentsApi.standings(slug);
    setStandings(Array.isArray(data) ? data : []);
    setExpandedSlug(slug);
  };

  const openMyGame = async (slug: string) => {
    try {
      const { data } = await tournamentsApi.myGame(slug);
      if (data?.game?.id) {
        window.location.href = `/play?game=${data.game.id}`;
      } else {
        setStatus("Aucune partie active pour vous dans ce tournoi");
      }
    } catch {
      setStatus("Erreur lors de la recherche de partie");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("tournaments.title")}</h1>
      <p className="opacity-70 mb-6">{t("tournaments.subtitle")}</p>

      <label className="flex items-center gap-2 mb-6 text-sm">
        <input
          type="checkbox"
          checked={africanOnly}
          onChange={(e) => setAfricanOnly(e.target.checked)}
        />
        Coupes africaines uniquement
      </label>

      {status && <p className="text-africhess-gold mb-4">{status}</p>}

      <div className="space-y-4">
        {list.map((t) => (
          <article key={t.id} className="glass-card p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <h2 className="font-semibold text-lg">{t.name}</h2>
              {t.is_african_cup && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-africhess-gold/20">
                  Coupe africaine
                </span>
              )}
            </div>
            <p className="text-sm opacity-80 mb-3">{t.description || "—"}</p>
            <div className="flex flex-wrap gap-3 text-xs opacity-70 mb-4">
              <span className="capitalize">{t.mode}</span>
              <span>{t.format}</span>
              <span>
                {t.participant_count}/{t.max_players} joueurs
              </span>
              <span className="capitalize">{t.status}</span>
              {t.starts_at && (
                <span>{new Date(t.starts_at).toLocaleDateString("fr-FR")}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {t.status === "registration" && user && (
                <button
                  type="button"
                  onClick={() => register(t.slug)}
                  className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
                >
                  S&apos;inscrire
                </button>
              )}
              {user &&
                t.created_by?.id === user.id &&
                (t.status === "registration" || t.status === "upcoming") && (
                  <button
                    type="button"
                    onClick={() => startTournament(t.slug)}
                    className="px-4 py-2 rounded-lg border border-africhess-green text-africhess-green text-sm"
                  >
                    Démarrer le tournoi
                  </button>
                )}
              {t.status === "active" && user && (
                <button
                  type="button"
                  onClick={() => openMyGame(t.slug)}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Ma partie
                </button>
              )}
              <button
                type="button"
                onClick={() => loadStandings(t.slug)}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm"
              >
                {expandedSlug === t.slug ? "Masquer classement" : "Classement"}
              </button>
            </div>

            {expandedSlug === t.slug && (
              <div className="mt-4 border-t border-white/10 pt-3">
                {standings.length === 0 ? (
                  <p className="text-sm opacity-60">Pas encore de résultats</p>
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

            {!user && t.status === "registration" && (
              <Link
                href="/login"
                className="text-sm text-africhess-green hover:underline mt-2 inline-block"
              >
                Connexion pour s&apos;inscrire
              </Link>
            )}
          </article>
        ))}
        {list.length === 0 && (
          <p className="opacity-60 text-center py-12">
            Aucun tournoi ouvert. Revenez bientôt !
          </p>
        )}
      </div>
    </div>
  );
}
