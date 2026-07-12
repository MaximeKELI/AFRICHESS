"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { UserSearchBar } from "@/components/social/UserSearchBar";
import { useAuthStore } from "@/store/auth";

interface Player {
  username: string;
  display_name: string;
  country: string;
  title?: string;
}

export default function PlayersPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    socialApi
      .africanPlayers()
      .then((res) => {
        setPlayers(res.data.results || res.data);
        setError(null);
      })
      .catch((err) => {
        setPlayers([]);
        setError(formatApiError(err, t("community.error.load")));
      })
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/community" className="text-sm text-africhess-gold hover:underline mb-2 inline-block">
        ← {t("nav.community")}
      </Link>
      <h1 className="font-display text-3xl font-bold mb-2">{t("players.title")}</h1>
      <p className="opacity-70 mb-6">{t("players.subtitle")}</p>

      {user && (
        <div className="mb-8 max-w-md">
          <p className="text-sm opacity-60 mb-2">{t("players.search")}</p>
          <UserSearchBar />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/leaderboard"
          className="px-4 py-2 rounded-lg african-gradient text-white text-sm font-medium"
        >
          {t("players.leaderboard")}
        </Link>
        <Link
          href="/friends"
          className="px-4 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/10"
        >
          {t("nav.friends")}
        </Link>
      </div>

      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60 mb-4">{t("common.loading")}</p>}

      <h2 className="text-lg font-semibold mb-4 text-africhess-gold">
        {t("community.players.title")}
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.length > 0 ? (
          players.map((p) => (
            <Link
              key={p.username}
              href={`/profile/${p.username}`}
              className="glass-card p-4 hover:ring-2 ring-africhess-gold/30"
            >
              <p className="font-semibold">
                {p.title ? `${p.title} ` : ""}
                {p.display_name || p.username}
              </p>
              <p className="text-sm opacity-60">{p.country}</p>
            </Link>
          ))
        ) : (
          !loading && <p className="opacity-60 col-span-full">{t("community.players.empty")}</p>
        )}
      </div>
    </div>
  );
}
