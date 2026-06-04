"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";

interface LiveGame {
  id: string;
  white_player?: { username: string };
  black_player?: { username: string };
  mode: string;
}

export default function LiveGamesPage() {
  const [games, setGames] = useState<LiveGame[]>([]);

  useEffect(() => {
    const load = () =>
      gamesApi.live().then(({ data }) => setGames(Array.isArray(data) ? data : []));
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Parties en direct</h1>
      {games.length === 0 ? (
        <p className="opacity-60">Aucune partie humaine en cours.</p>
      ) : (
        <ul className="space-y-3">
          {games.map((g) => (
            <li key={g.id} className="glass-card p-4 flex justify-between items-center">
              <div>
                <span className="font-medium">
                  {g.white_player?.username ?? "?"} vs {g.black_player?.username ?? "?"}
                </span>
                <span className="text-xs opacity-60 ml-2 capitalize">{g.mode}</span>
              </div>
              <Link
                href={`/watch/${g.id}`}
                className="text-sm text-africhess-gold hover:underline"
              >
                Observer →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
