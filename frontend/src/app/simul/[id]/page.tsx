"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

interface SimulBoard {
  board_number: number;
  game_id: string;
  opponent: string;
  status: string;
  result: string;
}

interface SimulDetail {
  id: number;
  title: string;
  host: string;
  host_id: number;
  status: string;
  max_boards: number;
  boards: SimulBoard[];
}

export default function SimulHostPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [detail, setDetail] = useState<SimulDetail | null>(null);

  const load = () => {
    gamesApi.simulDetail(Number(params.id)).then(({ data }) => setDetail(data as SimulDetail)).catch(() => {});
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [params.id]);

  if (!detail) {
    return <p className="p-8 text-center opacity-60">{t("common.loading")}</p>;
  }

  const isHost = user?.id === detail.host_id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/simul" className="text-sm text-africhess-gold hover:underline">
        {t("simul.back")}
      </Link>
      <h1 className="font-display text-3xl font-bold">{detail.title}</h1>
      <p className="text-sm opacity-60">
        {detail.host} · {detail.boards.length}/{detail.max_boards} · {detail.status}
      </p>

      {isHost && (
        <p className="text-sm text-africhess-green">{t("simul.hostHint")}</p>
      )}

      <div className="grid gap-3">
        {detail.boards.map((b) => (
          <Link
            key={b.game_id}
            href={`/play?game=${b.game_id}`}
            className="glass-card p-4 flex justify-between items-center hover:border-africhess-gold/40 transition"
          >
            <div>
              <p className="font-medium">
                {t("simul.board", { n: b.board_number })} — {b.opponent}
              </p>
              <p className="text-xs opacity-50">{b.status}{b.result ? ` · ${b.result}` : ""}</p>
            </div>
            <span className="text-sm text-africhess-gold">{t("simul.openBoard")}</span>
          </Link>
        ))}
        {detail.boards.length === 0 && (
          <p className="text-sm opacity-50 text-center py-8">{t("simul.waitingPlayers")}</p>
        )}
      </div>
    </div>
  );
}
