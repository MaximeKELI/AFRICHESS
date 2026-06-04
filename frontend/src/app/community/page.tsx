"use client";

import { useEffect, useState } from "react";
import { socialApi } from "@/lib/api";
import Link from "next/link";

export default function CommunityPage() {
  const [clubs, setClubs] = useState<Array<{ name: string; slug: string; country: string; member_count: number }>>([]);
  const [players, setPlayers] = useState<Array<{ username: string; display_name: string; country: string; title?: string }>>([]);

  useEffect(() => {
    socialApi.clubs().then(({ data }) => setClubs(data.results || data)).catch(() => {});
    socialApi.africanPlayers().then(({ data }) => setPlayers(data.results || data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">Community</h1>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-africhess-gold">Featured African Players</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.length > 0 ? players.map((p) => (
            <Link key={p.username} href={`/profile/${p.username}`} className="glass-card p-4 hover:ring-2 ring-africhess-gold/30">
              <p className="font-semibold">{p.title && `${p.title} `}{p.display_name || p.username}</p>
              <p className="text-sm opacity-60">{p.country}</p>
            </Link>
          )) : (
            <p className="opacity-60 col-span-full">Featured players coming soon.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-africhess-green">Chess Clubs</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {clubs.length > 0 ? clubs.map((c) => (
            <div key={c.slug} className="glass-card p-4">
              <h3 className="font-semibold">{c.name}</h3>
              <p className="text-sm opacity-60">{c.country} · {c.member_count} members</p>
            </div>
          )) : (
            <p className="opacity-60">Create the first African chess club!</p>
          )}
        </div>
      </section>
    </div>
  );
}
