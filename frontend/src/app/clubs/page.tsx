"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface Club {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
}

export default function ClubsPage() {
  const { user } = useAuthStore();
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    socialApi.clubs().then(({ data }) => setClubs(Array.isArray(data) ? data : data.results ?? []));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Clubs</h1>
      {!user && <p className="mb-4 opacity-70">Connectez-vous pour rejoindre un club.</p>}
      <div className="space-y-4">
        {clubs.map((c) => (
          <article key={c.id} className="glass-card p-5">
            <h2 className="font-semibold text-lg">{c.name}</h2>
            <p className="text-sm opacity-70 mt-1">{c.description || "—"}</p>
            <p className="text-xs mt-2 opacity-50">
              {c.member_count} membres {c.country && `· ${c.country}`}
            </p>
          </article>
        ))}
        {clubs.length === 0 && <p className="opacity-60">Aucun club public pour l&apos;instant.</p>}
      </div>
      <Link href="/friends" className="inline-block mt-6 text-africhess-gold text-sm hover:underline">
        Voir aussi : amis & défis →
      </Link>
    </div>
  );
}
