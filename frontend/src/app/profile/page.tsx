"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { ratingsApi } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [ratings, setRatings] = useState<Array<{ mode: string; elo: number; peak_elo: number }>>([]);

  useEffect(() => {
    fetchProfile();
    ratingsApi.me().then(({ data }) => setRatings(data)).catch(() => {});
  }, [fetchProfile]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Link href="/login" className="text-africhess-gold underline">Log in to view profile</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{user.display_name || user.username}</h1>
      <p className="opacity-60 mb-8">Country: {user.country}</p>

      {user.stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-africhess-gold">{user.stats.games_played}</p>
            <p className="text-sm opacity-60">Games</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-africhess-green">{user.stats.win_rate}%</p>
            <p className="text-sm opacity-60">Win Rate</p>
          </div>
        </div>
      )}

      <h2 className="font-semibold mb-4">Ratings</h2>
      <div className="space-y-2">
        {ratings.map((r) => (
          <div key={r.mode} className="glass-card p-4 flex justify-between">
            <span className="capitalize">{r.mode}</span>
            <span className="font-mono font-bold">{r.elo} <span className="text-sm opacity-50">peak {r.peak_elo}</span></span>
          </div>
        ))}
        {ratings.length === 0 && <p className="opacity-60">Play your first game to earn a rating!</p>}
      </div>
    </div>
  );
}
