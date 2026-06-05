"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { pickAiAvatar } from "@/lib/avatars";

export interface RecentGameRow {
  id: string;
  white_player: { id: number; username: string; display_name?: string } | null;
  black_player: { id: number; username: string; display_name?: string } | null;
  status: string;
  mode: string;
  result: string;
  is_vs_ai?: boolean;
  ai_target_elo?: number;
  created_at: string;
  ended_at: string | null;
}

function opponentLabel(
  game: RecentGameRow,
  userId: number
): string {
  if (game.is_vs_ai) {
    const ai = pickAiAvatar(game.ai_target_elo);
    const elo = game.ai_target_elo;
    return elo ? `${ai.name} (${elo})` : ai.name;
  }
  const isWhite = game.white_player?.id === userId;
  const opp = isWhite ? game.black_player : game.white_player;
  return opp?.display_name || opp?.username || "Adversaire";
}

function outcomeLabel(game: RecentGameRow, userId: number): string {
  if (game.status === "active") return "En cours";
  if (!game.result || game.result === "*") return "Annulée";
  const isWhite = game.white_player?.id === userId;
  if (game.result === "1/2-1/2") return "Nulle";
  if (game.result === "1-0") return isWhite ? "Victoire" : "Défaite";
  if (game.result === "0-1") return isWhite ? "Défaite" : "Victoire";
  return game.result;
}

function outcomeClass(label: string): string {
  if (label === "Victoire") return "text-africhess-green";
  if (label === "Défaite") return "text-africhess-terracotta";
  if (label === "En cours") return "text-africhess-gold";
  return "opacity-70";
}

interface RecentGamesListProps {
  limit?: number;
  showTitle?: boolean;
}

const LOCALE_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-EG",
  pt: "pt-PT",
  sw: "sw-KE",
};

export function RecentGamesList({ limit = 15, showTitle = true }: RecentGamesListProps) {
  const { user, locale } = useAuthStore();
  const [games, setGames] = useState<RecentGameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    gamesApi
      .list()
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        setGames(rows.slice(0, limit));
      })
      .catch((err) => {
        setGames([]);
        setError(formatApiError(err, "Impossible de charger l'historique."));
      })
      .finally(() => setLoading(false));
  }, [user, limit]);

  if (!user) return null;

  return (
    <div className="glass-card p-5">
      {showTitle && (
        <h2 className="font-semibold text-lg mb-3">Parties précédentes</h2>
      )}
      {loading && <p className="text-sm opacity-60">Chargement…</p>}
      {error && <p className="text-sm text-africhess-terracotta">{error}</p>}
      {!loading && !error && games.length === 0 && (
        <p className="text-sm opacity-60">Aucune partie enregistrée pour l&apos;instant.</p>
      )}
      {!loading && games.length > 0 && (
        <ul className="space-y-2 max-h-[min(50vh,420px)] overflow-y-auto pr-1">
          {games.map((g) => {
            const outcome = outcomeLabel(g, user.id);
            const date = g.ended_at || g.created_at;
            const when = date
              ? new Date(date).toLocaleDateString(LOCALE_MAP[locale] ?? "fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            const href =
              g.status === "active"
                ? `/play?game=${g.id}&mode=${g.mode}`
                : `/watch/${g.id}`;
            return (
              <li key={g.id}>
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate capitalize">
                      {g.mode} · {opponentLabel(g, user.id)}
                    </p>
                    <p className="text-xs opacity-50">{when}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${outcomeClass(outcome)}`}>
                    {outcome}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
