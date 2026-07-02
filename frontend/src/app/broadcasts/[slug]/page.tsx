"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";

interface BoardRow {
  board_number: number;
  label: string;
  game: {
    id: string;
    fen?: string;
    status?: string;
    mode?: string;
    white_player?: { username: string; display_name?: string };
    black_player?: { username: string; display_name?: string };
  };
}

interface BroadcastDetail {
  slug: string;
  title: string;
  description: string;
  boards: BoardRow[];
}

export default function BroadcastDetailPage({ params }: { params: { slug: string } }) {
  const { t } = useTranslation();
  const [data, setData] = useState<BroadcastDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      gamesApi
        .broadcastDetail(params.slug)
        .then(({ data: d }) => setData(d as BroadcastDetail))
        .catch((err) => setError(formatApiError(err, t("broadcasts.error.load"))));
    };
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [params.slug, t]);

  if (!data && !error) {
    return <p className="p-8 text-center opacity-60">{t("common.loading")}</p>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/broadcasts" className="text-sm opacity-60 hover:opacity-100">
        ← {t("broadcasts.title")}
      </Link>
      <h1 className="font-display text-2xl font-bold mt-4 mb-2">{data?.title}</h1>
      {data?.description && <p className="text-sm opacity-70 mb-6">{data.description}</p>}

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.boards ?? []).map((bb) => (
          <article key={bb.game.id} className="glass-card p-3">
            <p className="text-xs opacity-50 mb-1">
              #{bb.board_number} · {bb.game.mode}
            </p>
            <p className="text-sm font-medium mb-2 truncate">{bb.label}</p>
            <div className="max-w-[220px] mx-auto">
              <ChessBoard fen={bb.game.fen || "start"} interactive={false} />
            </div>
            <Link
              href={`/watch/${bb.game.id}`}
              className="block text-center text-xs text-africhess-gold mt-2 hover:underline"
            >
              {t("live.watch")}
            </Link>
          </article>
        ))}
      </div>

      {data && data.boards.length === 0 && (
        <p className="opacity-60 text-center py-12">{t("broadcasts.noBoards")}</p>
      )}
    </div>
  );
}
