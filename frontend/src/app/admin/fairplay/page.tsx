"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { DataTable } from "@/components/stats/StatsTables";
import { formatLocaleDate } from "@/lib/i18n/labels";

interface Overview {
  pending_cases: number;
  in_review_cases: number;
  flagged_by_verdict: Record<string, number>;
  likely_cheat_7d: number;
}

interface QueueCase {
  id: number;
  status: string;
  peer_score_delta: number;
  decision: string;
  created_at: string;
  reviewer: string | null;
  report: {
    user_id: number;
    username: string;
    verdict: string;
    overall_score: number;
    engine_top1_rate: number;
  };
  game: {
    id: string;
    mode: string;
    white: string | null;
    black: string | null;
    ended_at: string | null;
  };
}

const VERDICT_CLASS: Record<string, string> = {
  clean: "text-emerald-400",
  review: "text-amber-400",
  suspicious: "text-orange-400",
  likely_cheat: "text-red-400",
};

export default function AdminFairPlayPage() {
  const { t, locale } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cases, setCases] = useState<QueueCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.fairplayOverview(),
      adminApi.fairplayQueue({ status: statusFilter, limit: 80 }),
    ])
      .then(([ov, q]) => {
        setOverview(ov.data);
        setCases(q.data.cases ?? []);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [statusFilter, t]);

  const rows = useMemo(
    () =>
      cases.map((c) => ({
        player: (
          <Link href={`/admin/users/${c.report.user_id}`} className="text-africhess-gold hover:underline">
            {c.report.username}
          </Link>
        ),
        game: (
          <Link href={`/admin/fairplay/games/${c.game.id}`} className="hover:underline">
            {c.game.white ?? "?"} vs {c.game.black ?? "?"}
          </Link>
        ),
        verdict: <span className={VERDICT_CLASS[c.report.verdict] ?? ""}>{c.report.verdict}</span>,
        score: c.report.overall_score.toFixed(1),
        peerDelta: c.peer_score_delta.toFixed(1),
        status: c.status,
        date: c.game.ended_at ? formatLocaleDate(c.game.ended_at, locale) : "—",
        action: (
          <Link
            href={`/admin/fairplay/games/${c.game.id}`}
            className="text-sm px-2 py-1 rounded border hover:border-africhess-gold/50"
          >
            {t("admin.fairplay.viewGame")}
          </Link>
        ),
      })),
    [cases, locale, t]
  );

  if (loading) return <p className="opacity-60">{t("common.loading")}</p>;
  if (error) return <InlineAlert>{error}</InlineAlert>;

  const cards = [
    { label: t("admin.fairplay.pending"), value: overview?.pending_cases ?? 0 },
    { label: t("admin.fairplay.inReview"), value: overview?.in_review_cases ?? 0 },
    { label: t("admin.fairplay.likely7d"), value: overview?.likely_cheat_7d ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold">{t("admin.fairplay.title")}</h2>
        <p className="text-sm opacity-60">{t("admin.fairplay.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-4">
            <p className="text-sm opacity-60">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "in_review", "confirmed", "dismissed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              statusFilter === s ? "african-gradient text-white border-transparent" : "hover:border-africhess-gold/40"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="opacity-60">{t("admin.fairplay.noCases")}</p>
      ) : (
        <DataTable
          caption={t("admin.fairplay.queue")}
          columns={[
            { key: "player", label: t("admin.fairplay.col.player") },
            { key: "game", label: t("admin.fairplay.col.game") },
            { key: "verdict", label: t("admin.fairplay.col.verdict") },
            { key: "score", label: t("admin.fairplay.col.score") },
            { key: "peerDelta", label: t("admin.fairplay.col.peerDelta") },
            { key: "status", label: t("admin.fairplay.col.status") },
            { key: "date", label: t("admin.fairplay.col.date") },
            { key: "action", label: "" },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
