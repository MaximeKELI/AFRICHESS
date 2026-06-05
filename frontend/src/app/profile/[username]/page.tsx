"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usersApi, ratingsApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelLabel, formatLocaleDate } from "@/lib/i18n/labels";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { useAuthStore } from "@/store/auth";

interface PublicUser {
  id: number;
  username: string;
  display_name: string;
  avatar?: string | null;
  bio: string;
  country: string;
  city: string;
  title: string;
  chess_level: string;
  date_joined: string;
  is_african_highlight: boolean;
  stats?: {
    games_played: number;
    games_won: number;
    win_rate: number;
    puzzles_solved: number;
    daily_puzzle_streak: number;
  };
}

interface RatingRow {
  mode: string;
  elo: number;
  games_count: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = String(params.username || "");
  const { user: me } = useAuthStore();
  const { t, locale } = useTranslation();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    Promise.all([usersApi.get(username), ratingsApi.user(username)])
      .then(([u, r]) => {
        setProfile(u.data);
        setRatings(Array.isArray(r.data) ? r.data : r.data.results ?? []);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("profile.public.error"))))
      .finally(() => setLoading(false));
  }, [username, t]);

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>;
  if (error) return <div className="max-w-3xl mx-auto px-4 py-12"><InlineAlert>{error}</InlineAlert></div>;
  if (!profile) return null;

  const isMe = me?.username === profile.username;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-start gap-5">
        <UserAvatar
          avatar={profile.avatar}
          displayName={profile.display_name}
          username={profile.username}
          size={88}
          className="rounded-2xl ring-2 ring-africhess-gold/30"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold truncate">
            {profile.title && <span className="text-africhess-terracotta mr-2">{profile.title}</span>}
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm opacity-60 mt-1">@{profile.username}</p>
          <p className="mt-2 flex items-center gap-1.5 flex-wrap text-sm opacity-80">
            <span>{countryFlag(profile.country)}</span>
            <span>{displayCountry(profile.country, locale)}</span>
            {profile.city && <span>· {profile.city}</span>}
            <span>· {chessLevelLabel(t, profile.chess_level)}</span>
          </p>
          {profile.is_african_highlight && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-africhess-gold/20 text-africhess-gold">
              {t("profile.public.highlight")}
            </span>
          )}
        </div>
      </div>

      {profile.bio && (
        <div className="glass-card p-5">
          <p className="text-sm opacity-90 whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {profile.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t("profile.stats.games")} value={profile.stats.games_played} />
          <StatCard label={t("profile.stats.wins")} value={`${profile.stats.win_rate}%`} />
          <StatCard label={t("puzzles.solved")} value={profile.stats.puzzles_solved} />
          <StatCard label={t("puzzles.streakLabel")} value={profile.stats.daily_puzzle_streak} />
        </div>
      )}

      {ratings.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">{t("profile.public.ratings")}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ratings.map((r) => (
              <div key={r.mode} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="capitalize opacity-70">{r.mode}</span>
                <span className="font-mono font-bold text-africhess-gold">{r.elo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs opacity-50">
        {t("profile.public.memberSince")}{" "}
        {formatLocaleDate(locale, profile.date_joined, { dateStyle: "medium" })}
      </p>

      <div className="flex flex-wrap gap-3">
        {isMe ? (
          <Link href="/profile" className="px-4 py-2 rounded-lg african-gradient text-white text-sm">
            {t("profile.public.edit")}
          </Link>
        ) : (
          <Link href={`/friends?add=${profile.username}`} className="px-4 py-2 rounded-lg border text-sm hover:border-africhess-gold">
            {t("profile.public.addFriend")}
          </Link>
        )}
        <Link href="/leaderboard" className="px-4 py-2 rounded-lg border text-sm opacity-70 hover:opacity-100">
          {t("leaderboard.title")}
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-xl font-bold text-africhess-gold">{value}</p>
      <p className="text-xs opacity-60 mt-1">{label}</p>
    </div>
  );
}
