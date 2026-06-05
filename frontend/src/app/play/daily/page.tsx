"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { Clock, Swords } from "lucide-react";

interface DailyGame {
  id: string;
  white_player: { username: string; display_name: string };
  black_player: { username: string; display_name: string };
  status: string;
  turn_deadline: string | null;
  days_per_move: number;
  move_count: number;
}

export default function DailyChessPage() {
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [games, setGames] = useState<DailyGame[]>([]);
  const [friend, setFriend] = useState("");
  const [days, setDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    gamesApi
      .correspondence()
      .then(({ data }) => setGames(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, t("daily.error.load"))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, t]);

  const challenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friend.trim()) return;
    try {
      const { data } = await gamesApi.correspondenceChallenge(friend.trim(), days);
      setError(null);
      setFriend("");
      load();
      window.location.href = `/play?game=${data.id}`;
    } catch (err) {
      setError(formatApiError(err, t("daily.error.challenge")));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Clock className="text-africhess-gold" />
          {t("daily.title")}
        </h1>
        <p className="opacity-70 mt-2 text-sm">{t("daily.subtitle")}</p>
      </div>

      {error && <InlineAlert>{error}</InlineAlert>}

      {!user && (
        <p className="opacity-70">
          <Link href="/login" className="text-africhess-gold underline">{t("nav.login")}</Link>
          {" "}{t("daily.loginHint")}
        </p>
      )}

      {user && (
        <form onSubmit={challenge} className="glass-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">{t("daily.challenge")}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder={t("daily.friendUsername")}
              value={friend}
              onChange={(e) => setFriend(e.target.value)}
              className="flex-1 min-w-[160px] px-4 py-2 rounded-lg border bg-transparent"
            />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border bg-transparent"
            >
              {[1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>{t("daily.daysPerMove", { n: d })}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg african-gradient text-white text-sm">
              {t("daily.challengeBtn")}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="opacity-60">{t("common.loading")}</p>}

      <div className="space-y-3">
        {games.map((g) => {
          const isWhite = user?.username === g.white_player?.username;
          const opponent = isWhite ? g.black_player : g.white_player;
          const myTurn =
            (g.move_count % 2 === 0 && isWhite) || (g.move_count % 2 === 1 && !isWhite);
          return (
            <Link
              key={g.id}
              href={`/play?game=${g.id}`}
              className="glass-card p-4 flex items-center justify-between gap-4 hover:ring-2 ring-africhess-gold/30"
            >
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Swords size={16} />
                  vs {opponent?.display_name || opponent?.username}
                </p>
                <p className="text-xs opacity-60 mt-1">
                  {g.move_count} {t("daily.moves")}
                  {g.turn_deadline && (
                    <> · {t("daily.deadline")}{" "}
                    {formatLocaleDate(locale, g.turn_deadline, { dateStyle: "medium", timeStyle: "short" })}
                    </>
                  )}
                </p>
              </div>
              {myTurn && (
                <span className="text-xs px-2 py-1 rounded-full bg-africhess-green/20 text-africhess-green shrink-0">
                  {t("daily.yourTurn")}
                </span>
              )}
            </Link>
          );
        })}
        {user && !loading && games.length === 0 && (
          <p className="opacity-60 text-center py-8">{t("daily.empty")}</p>
        )}
      </div>
    </div>
  );
}
