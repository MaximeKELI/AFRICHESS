"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { ratingsApi, authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { UserAvatarUpload } from "@/components/profile/UserAvatarUpload";
import { FlairPicker } from "@/components/profile/FlairPicker";
import { LevelPicker } from "@/components/profile/LevelPicker";
import { UserFlair } from "@/components/profile/UserFlair";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { BackgroundPicker } from "@/components/chess/BackgroundPicker";
import { OptionSection } from "@/components/ui/OptionSection";
import { CommentsToggle } from "@/components/chess/CommentsToggle";
import { FairPlayAppealPanel } from "@/components/fairplay/FairPlayAppealPanel";
import { RecentGamesList } from "@/components/game/RecentGamesList";
import { type ChessLevelId } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";
import { chessLevelLabel, modeLabel } from "@/lib/i18n/labels";
import { countryFlag } from "@/lib/worldCountries";
import { displayCountry } from "@/lib/countries";
import {
  formatElo,
  isProvisionalRating,
  type RatingRow,
} from "@/lib/ratings";

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const { t, locale } = useTranslation();
  const [ratings, setRatings] = useState<RatingRow[]>([]);
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

  const profileSections = [
    { id: "profile-customize", label: t("profile.customize") },
    { id: "profile-appearance", label: t("profile.appearance.title") },
    { id: "profile-ratings", label: t("profile.ratings.title") },
    { id: "profile-fairplay", label: t("fairplay.appeal.title") },
  ];

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
          <h1 className="font-display text-3xl font-bold inline-flex items-center gap-2">
            <UserFlair flair={user.flair} className="text-2xl" />
            {user.display_name || user.username}
          </h1>
          <p className="opacity-60 flex items-center gap-1.5 flex-wrap">
            <span>{countryFlag(user.country)}</span>
            <span>{displayCountry(user.country, locale)}</span>
            <span>·</span>
            <span>{levelLabel}</span>
          </p>
        </div>
      </div>

      <nav
        className="sticky top-14 z-30 -mx-4 px-4 py-2 bg-[var(--bg)]/90 backdrop-blur-sm border-b border-white/5"
        aria-label={t("profile.nav.sections")}
      >
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {profileSections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 opacity-80 hover:opacity-100 hover:text-africhess-gold hover:border-africhess-gold/40 transition-colors whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

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

      <div id="profile-customize" className="glass-card p-6 space-y-6 scroll-mt-20">
        <h2 className="font-semibold text-lg">{t("profile.customize")}</h2>
        <UserAvatarUpload
          avatar={user.avatar}
          displayName={user.display_name}
          username={user.username}
          onUpdated={fetchProfile}
        />
        <hr className="border-white/10" />
        <FlairPicker />
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

      <div id="profile-appearance" className="space-y-4 scroll-mt-20">
        <h2 className="font-semibold text-lg">{t("profile.appearance.title")}</h2>
        <OptionSection
          title={t("board.picker.title")}
          description={t("board.picker.hint")}
        >
          <BoardThemePicker showHeader={false} showPieces={false} />
        </OptionSection>
        <OptionSection
          title={t("board.picker.pieces")}
          description={t("board.picker.piecesHint")}
        >
          <BoardThemePicker showHeader={false} showColors={false} />
        </OptionSection>
        <OptionSection
          title={t("background.picker.title")}
          description={t("background.picker.hint")}
        >
          <BackgroundPicker showHeader={false} />
        </OptionSection>
      </div>

      <div className="glass-card p-6">
        <CommentsToggle />
      </div>

      <div id="profile-ratings" className="scroll-mt-20 space-y-4">
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
          <h2 className="font-semibold mb-2">{t("profile.ratings.elo")}</h2>
          <p className="text-xs opacity-55 mb-4">{t("profile.ratings.provisionalNote")}</p>
          {ratingsError && <InlineAlert className="mb-3">{ratingsError}</InlineAlert>}
          <div className="space-y-2">
            {ratings.map((r) => {
              const provisional = isProvisionalRating(r);
              const remaining =
                r.games_until_established ??
                Math.max(0, 5 - (r.games_count ?? 0));
              return (
                <div key={r.mode} className="glass-card p-4">
                  <div className="flex justify-between items-start gap-3">
                    <span className="capitalize">{modeLabel(t, r.mode)}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold">
                        {formatElo(r.elo, provisional, r.rating_display)}
                      </span>
                      {r.peak_elo != null && (
                        <span className="text-sm opacity-50 block">
                          {t("profile.ratings.peak", { elo: r.peak_elo })}
                        </span>
                      )}
                    </div>
                  </div>
                  {provisional && (
                    <p className="text-xs text-africhess-gold/90 mt-2">
                      {t("profile.ratings.provisional")} —{" "}
                      {t("profile.ratings.gamesUntil", {
                        count: remaining,
                        mode: modeLabel(t, r.mode),
                      })}
                    </p>
                  )}
                </div>
              );
            })}
            {ratings.length === 0 && (
              <p className="opacity-60">{t("profile.ratings.empty")}</p>
            )}
          </div>
        </div>
      </div>

      <div id="profile-fairplay" className="scroll-mt-20">
        <FairPlayAppealPanel />
      </div>
      <p className="text-center flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <Link href="/settings/subscription" className="text-sm text-africhess-gold hover:underline">
          {t("settings.subscription.title")}
        </Link>
        <Link href="/settings/security" className="text-sm text-africhess-gold hover:underline">
          {t("security.2fa.title")}
        </Link>
      </p>
    </div>
  );
}
