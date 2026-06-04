"use client";

import { useEffect, useState } from "react";
import { ratingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { t } from "@/lib/i18n";
import { AFRICAN_COUNTRIES } from "@/lib/countries";

interface Entry {
  user: { username: string; display_name: string; country: string; title?: string };
  elo: number;
  games_count: number;
}

export default function LeaderboardPage() {
  const { locale } = useAuthStore();
  const [tab, setTab] = useState<"global" | "african">("african");
  const [mode, setMode] = useState("blitz");
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const fetcher = tab === "global" ? ratingsApi.globalLeaderboard : ratingsApi.africanLeaderboard;
    fetcher(mode).then(({ data }) => setEntries(data.results || data)).catch(() => setEntries([]));
  }, [tab, mode]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Leaderboards</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTab("african")}
          className={`px-4 py-2 rounded-lg ${tab === "african" ? "african-gradient text-white" : "border"}`}
        >
          {t(locale, "leaderboard.african")}
        </button>
        <button
          onClick={() => setTab("global")}
          className={`px-4 py-2 rounded-lg ${tab === "global" ? "african-gradient text-white" : "border"}`}
        >
          {t(locale, "leaderboard.global")}
        </button>
        {["bullet", "blitz", "rapid"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg capitalize ${mode === m ? "ring-2 ring-africhess-gold" : "border"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4">#</th>
              <th className="text-left p-4">Player</th>
              <th className="text-left p-4">Country</th>
              <th className="text-right p-4">ELO</th>
              <th className="text-right p-4">Games</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 font-bold text-africhess-gold">{i + 1}</td>
                <td className="p-4">
                  {e.user.title && <span className="text-africhess-terracotta mr-1">{e.user.title}</span>}
                  {e.user.display_name || e.user.username}
                </td>
                <td className="p-4">{e.user.country}</td>
                <td className="p-4 text-right font-mono font-bold">{e.elo}</td>
                <td className="p-4 text-right opacity-60">{e.games_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="p-8 text-center opacity-60">No ratings yet. Be the first to play!</p>
        )}
      </div>
    </div>
  );
}
