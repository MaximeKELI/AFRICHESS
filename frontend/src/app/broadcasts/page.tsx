"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";

interface BroadcastRow {
  slug: string;
  title: string;
  description: string;
  status: string;
  board_count: number;
  tournament_slug?: string | null;
}

export default function BroadcastsPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gamesApi
      .broadcastList()
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, t("broadcasts.error.load"))))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("broadcasts.title")}</h1>
      <p className="text-sm opacity-70 mb-6">{t("broadcasts.subtitle")}</p>

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {loading && <p className="text-sm opacity-60">{t("common.loading")}</p>}

      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b.slug} className="glass-card p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h2 className="font-semibold">{b.title}</h2>
                {b.description && <p className="text-sm opacity-70 mt-1">{b.description}</p>}
                <p className="text-xs opacity-50 mt-2">
                  {b.board_count} {t("broadcasts.boards")} · {b.status}
                  {b.tournament_slug && ` · ${b.tournament_slug}`}
                </p>
              </div>
              <Link
                href={`/broadcasts/${b.slug}`}
                className="text-sm text-africhess-gold hover:underline shrink-0"
              >
                {t("broadcasts.watch")} →
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {!loading && list.length === 0 && (
        <p className="opacity-60 text-center py-12">{t("broadcasts.empty")}</p>
      )}
    </div>
  );
}
