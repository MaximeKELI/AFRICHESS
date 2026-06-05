"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { ratingsApi, authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { UserAvatarUpload } from "@/components/profile/UserAvatarUpload";
import { LevelPicker } from "@/components/profile/LevelPicker";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { RecentGamesList } from "@/components/game/RecentGamesList";
import { type ChessLevelId } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelLabel } from "@/lib/i18n/labels";
import { countryFlag, displayCountry } from "@/lib/worldCountries";

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const { t } = useTranslation();
  const [ratings, setRatings] = useState<Array<{ mode: string; elo: number; peak_elo: number }>>([]);
  const [chessLevel, setChessLevel] = useState<ChessLevelId>("intermediate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ratingsError, setRatingsError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    ratingsApi
      .me()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        setRatings(list);
        setRatingsError(null);
      })
      .catch((err) => {
        setRatings([]);
        setRatingsError(formatApiError(err, t("profile.error.ratings")));
      });
  }, [fetchProfile, t]);

  useEffect(() => {
    if (user?.chess_level) {
      setChessLevel(user.chess_level as ChessLevelId);
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await authApi.updateProfile({ chess_level: chessLevel });
      await fetchProfile();
      setSaved(true);
    } catch (err) {
      setSaveError(formatApiError(err, t("profile.error.save")));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Link href="/login" className="text-africhess-gold underline">
          {t("profile.loginRequired")}
        </Link>
      </div>
    );
  }

  const levelLabel = chessLevelLabel(t, user.chess_level ?? "intermediate");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <UserAvatar
          avatar={user.avatar}
          displayName={user.display_name}
          username={user.username}
          size={80}
          className="rounded-2xl ring-2"
        />
        <div>
          <h1 className="font-display text-3xl font-bold">{user.display_name || user.username}</h1>
          <p className="opacity-60">
            {user.country} · {levelLabel}
          </p>
        </div>
      </div>

      {user.stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-africhess-gold">{user.stats.games_played}</p>
            <p className="text-sm opacity-60">{t("profile.stats.games")}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-africhess-green">{user.stats.win_rate}%</p>
            <p className="text-sm opacity-60">{t("profile.stats.wins")}</p>
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <h2 className="font-semibold text-lg">{t("profile.customize")}</h2>
        <UserAvatarUpload
          avatar={user.avatar}
          displayName={user.display_name}
          username={user.username}
          onUpdated={fetchProfile}
        />
        <hr className="border-white/10" />
        <p className="text-xs opacity-55 -mt-2">{t("profile.level.hint")}</p>
        <LevelPicker value={chessLevel} onChange={setChessLevel} />
        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-2.5 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
        >
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
        {saved && <p className="text-sm text-africhess-green text-center">{t("profile.saved")}</p>}
        {saveError && <InlineAlert>{saveError}</InlineAlert>}
      </div>

      <div className="glass-card p-6 space-y-6">
        <BoardThemePicker />
        <hr className="border-white/10" />
        <CommentsToggle />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">{t("profile.ratings.title")}</h2>
        <Link
          href="/stats"
          className="text-sm text-africhess-gold hover:underline"
        >
          {t("profile.ratings.detailed")}
        </Link>
      </div>

      <RecentGamesList />

      <div>
        <h2 className="font-semibold mb-4">{t("profile.ratings.elo")}</h2>
        {ratingsError && <InlineAlert className="mb-3">{ratingsError}</InlineAlert>}
        <div className="space-y-2">
          {ratings.map((r) => (
            <div key={r.mode} className="glass-card p-4 flex justify-between">
              <span className="capitalize">{r.mode}</span>
              <span className="font-mono font-bold">
                {r.elo}{" "}
                <span className="text-sm opacity-50">{t("profile.ratings.peak", { elo: r.peak_elo })}</span>
              </span>
            </div>
          ))}
          {ratings.length === 0 && (
            <p className="opacity-60">{t("profile.ratings.empty")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
