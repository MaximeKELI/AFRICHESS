"use client";

import { useEffect, useState } from "react";
import { tournamentsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";

interface Tournament {
  id: number;
  name: string;
  slug: string;
  description: string;
  format: string;
  status: string;
  mode: string;
  max_players: number;
  participant_count: number;
  is_african_cup: boolean;
  prize_pool: string;
  starts_at: string;
  country: string;
}

export default function TournamentsPage() {
  const { user } = useAuthStore();
  const [list, setList] = useState<Tournament[]>([]);
  const [africanOnly, setAfricanOnly] = useState(true);
  const [status, setStatus] = useState("");

  const load = () => {
    tournamentsApi.list(africanOnly).then(({ data }) => {
      setList(Array.isArray(data) ? data : data.results ?? []);
    });
  };

  useEffect(() => {
    load();
  }, [africanOnly]);

  const register = async (slug: string) => {
    if (!user) {
      setStatus("Connectez-vous pour vous inscrire");
      return;
    }
    setStatus("");
    try {
      await tournamentsApi.register(slug);
      setStatus("Inscription confirmée !");
      load();
    } catch {
      setStatus("Inscription impossible (complet ou fermé)");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">Tournois</h1>
      <p className="opacity-70 mb-6">Coupes africaines et arènes communautaires</p>

      <label className="flex items-center gap-2 mb-6 text-sm">
        <input
          type="checkbox"
          checked={africanOnly}
          onChange={(e) => setAfricanOnly(e.target.checked)}
        />
        Coupes africaines uniquement
      </label>

      {status && <p className="text-africhess-gold mb-4">{status}</p>}

      <div className="space-y-4">
        {list.map((t) => (
          <article key={t.id} className="glass-card p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <h2 className="font-semibold text-lg">{t.name}</h2>
              {t.is_african_cup && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-africhess-gold/20">
                  Coupe africaine
                </span>
              )}
            </div>
            <p className="text-sm opacity-80 mb-3">{t.description || "—"}</p>
            <div className="flex flex-wrap gap-3 text-xs opacity-70 mb-4">
              <span className="capitalize">{t.mode}</span>
              <span>{t.format}</span>
              <span>
                {t.participant_count}/{t.max_players} joueurs
              </span>
              <span className="capitalize">{t.status}</span>
              {t.starts_at && (
                <span>{new Date(t.starts_at).toLocaleDateString("fr-FR")}</span>
              )}
            </div>
            {t.status === "registration" && user && (
              <button
                type="button"
                onClick={() => register(t.slug)}
                className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
              >
                S&apos;inscrire
              </button>
            )}
            {!user && t.status === "registration" && (
              <Link href="/login" className="text-sm text-africhess-green hover:underline">
                Connexion pour s&apos;inscrire
              </Link>
            )}
          </article>
        ))}
        {list.length === 0 && (
          <p className="opacity-60 text-center py-12">
            Aucun tournoi ouvert. Revenez bientôt !
          </p>
        )}
      </div>
    </div>
  );
}
