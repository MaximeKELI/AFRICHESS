"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { ratingsApi, authApi } from "@/lib/api";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { LevelPicker } from "@/components/profile/LevelPicker";
import { BoardThemePicker } from "@/components/chess/BoardThemePicker";
import { AVATARS, CHESS_LEVELS, getAvatarSrc, type AvatarId, type ChessLevelId } from "@/lib/avatars";

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [ratings, setRatings] = useState<Array<{ mode: string; elo: number; peak_elo: number }>>([]);
  const [avatarPreset, setAvatarPreset] = useState<AvatarId>("avatar-1");
  const [chessLevel, setChessLevel] = useState<ChessLevelId>("intermediate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile();
    ratingsApi.me().then(({ data }) => setRatings(data)).catch(() => {});
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      const preset = AVATARS.find((a) => a.id === user.avatar_preset)?.id ?? "avatar-1";
      setAvatarPreset(preset);
      const level = CHESS_LEVELS.find((l) => l.id === user.chess_level)?.id ?? "intermediate";
      setChessLevel(level);
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await authApi.updateProfile({ avatar_preset: avatarPreset, chess_level: chessLevel });
      await fetchProfile();
      setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Link href="/login" className="text-africhess-gold underline">
          Connectez-vous pour voir votre profil
        </Link>
      </div>
    );
  }

  const levelLabel = CHESS_LEVELS.find((l) => l.id === user.chess_level)?.label ?? "Intermédiaire";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-africhess-gold shrink-0">
          <Image
            src={getAvatarSrc(user.avatar_preset)}
            alt="Avatar"
            fill
            className="object-cover"
          />
        </div>
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
            <p className="text-sm opacity-60">Parties</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-africhess-green">{user.stats.win_rate}%</p>
            <p className="text-sm opacity-60">Victoires</p>
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <h2 className="font-semibold text-lg">Personnaliser le profil</h2>
        <AvatarPicker value={avatarPreset} onChange={setAvatarPreset} />
        <LevelPicker value={chessLevel} onChange={setChessLevel} />
        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-2.5 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && <p className="text-sm text-africhess-green text-center">Profil mis à jour !</p>}
      </div>

      <div className="glass-card p-6">
        <BoardThemePicker />
      </div>

      <div>
        <h2 className="font-semibold mb-4">Classements ELO</h2>
        <div className="space-y-2">
          {ratings.map((r) => (
            <div key={r.mode} className="glass-card p-4 flex justify-between">
              <span className="capitalize">{r.mode}</span>
              <span className="font-mono font-bold">
                {r.elo}{" "}
                <span className="text-sm opacity-50">pic {r.peak_elo}</span>
              </span>
            </div>
          ))}
          {ratings.length === 0 && (
            <p className="opacity-60">Jouez votre première partie pour gagner un classement !</p>
          )}
        </div>
      </div>
    </div>
  );
}
