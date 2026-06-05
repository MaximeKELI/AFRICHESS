"use client";

import { useEffect, useState } from "react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import Link from "next/link";

export default function CommunityPage() {
  const [clubs, setClubs] = useState<Array<{ name: string; slug: string; country: string; member_count: number }>>([]);
  const [players, setPlayers] = useState<Array<{ username: string; display_name: string; country: string; title?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([socialApi.clubs(), socialApi.africanPlayers()])
      .then(([clubsRes, playersRes]) => {
        setClubs(clubsRes.data.results || clubsRes.data);
        setPlayers(playersRes.data.results || playersRes.data);
        setError(null);
      })
      .catch((err) => {
        setClubs([]);
        setPlayers([]);
        setError(formatApiError(err, "Impossible de charger la communauté."));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">Communauté</h1>
      {error && <InlineAlert className="mb-6">{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60 mb-6">Chargement…</p>}

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-africhess-terracotta">
          Histoires & culture des échecs en Afrique
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              title: "Les échecs au Sénégal",
              text: "Dakar et Saint-Louis accueillent des tournois ouverts qui réunissent joueurs locaux et visiteurs. Le jeu se transmet dans les écoles et les clubs de quartier.",
            },
            {
              title: "Nigeria, puissance montante",
              text: "Avec une jeune génération de grands maîtres et d'IM, le Nigeria forme l'élite du continent et inspire toute l'Afrique de l'Ouest.",
            },
            {
              title: "Éthiopie & Kenya",
              text: "Les championnats d'Afrique de l'Est développent des talents en blitz et en rapide, souvent sur mobile.",
            },
            {
              title: "AFRICHESS",
              text: "Notre plateforme relie les joueurs du continent : classements par pays, clubs et tournois en ligne à venir.",
            },
          ].map((story) => (
            <article key={story.title} className="glass-card p-5">
              <h3 className="font-semibold text-africhess-gold mb-2">{story.title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{story.text}</p>
            </article>
          ))}
        </div>
      </section>

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
