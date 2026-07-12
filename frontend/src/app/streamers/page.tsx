"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { marketplaceApi } from "@/lib/learningApi";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface StreamerRow {
  username: string;
  display_name: string;
  bio: string;
  twitch?: string;
  youtube?: string;
  embed_url?: string | null;
  is_featured?: boolean;
}

export default function StreamersPage() {
  const { t } = useTranslation();
  const [streamers, setStreamers] = useState<StreamerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    marketplaceApi
      .streamers()
      .then(({ data }) => setStreamers(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, t("streamers.empty"))))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/tv" className="text-africhess-gold hover:underline">
          {t("nav.tv")}
        </Link>
        <Link href="/live" className="text-africhess-gold hover:underline">
          {t("nav.currentGames")}
        </Link>
        <Link href="/broadcasts" className="text-africhess-gold hover:underline">
          {t("nav.broadcasts")}
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold">{t("streamers.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("streamers.subtitle")}</p>
      </div>

      {error && <InlineAlert>{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60">{t("common.loading")}</p>}

      {!loading && streamers.length === 0 && (
        <p className="opacity-60 text-center py-12">{t("streamers.empty")}</p>
      )}

      <ul className="space-y-4">
        {streamers.map((s) => (
          <li key={s.username} className="glass-card p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {s.display_name}
                  {s.is_featured && (
                    <span className="ml-2 text-xs text-africhess-gold">★</span>
                  )}
                </p>
                {s.bio && <p className="text-sm opacity-70 mt-1">{s.bio}</p>}
              </div>
              <div className="flex flex-wrap gap-2 text-sm h-fit">
                {s.twitch && (
                  <a
                    href={`https://twitch.tv/${s.twitch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg african-gradient text-white"
                  >
                    {t("streamers.twitch")}
                  </a>
                )}
                {s.youtube && (
                  <a
                    href={`https://www.youtube.com/channel/${s.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-white/20"
                  >
                    {t("streamers.youtube")}
                  </a>
                )}
              </div>
            </div>
            {s.embed_url && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <iframe
                  title={s.display_name}
                  src={s.embed_url}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
