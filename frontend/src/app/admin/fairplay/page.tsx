"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { ArrowUpRight } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

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

const STATUS_FILTERS = ["pending", "in_review", "confirmed", "dismissed"] as const;

function verdictTone(v: string): "ok" | "warn" | "danger" | "info" | "neutral" {
  if (v === "clean") return "ok";
  if (v === "review") return "warn";
  if (v === "suspicious") return "warn";
  if (v === "likely_cheat") return "danger";
  return "neutral";
}

function statusTone(s: string): "ok" | "warn" | "danger" | "info" | "neutral" | "gold" {
  if (s === "pending") return "warn";
  if (s === "in_review") return "info";
  if (s === "confirmed") return "danger";
  if (s === "dismissed") return "ok";
  return "neutral";
}

export default function AdminFairPlayPage() {
  const { t, locale } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cases, setCases] = useState<QueueCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");

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

  const statusLabel = (s: string) => t(`admin.fairplay.status.${s}`) || s;
  const verdictLabel = (v: string) => t(`admin.fairplay.verdict.${v}`) || v;

  if (loading && !overview) return <AdminSkeleton rows={7} />;
  if (error) return <InlineAlert>{error}</InlineAlert>;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t("admin.fairplay.title")}
        description={t("admin.fairplay.subtitle")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminKpi
          label={t("admin.fairplay.pending")}
          value={overview?.pending_cases ?? 0}
          tone={(overview?.pending_cases ?? 0) > 0 ? "warn" : "default"}
        />
        <AdminKpi
          label={t("admin.fairplay.inReview")}
          value={overview?.in_review_cases ?? 0}
          tone="default"
        />
        <AdminKpi
          label={t("admin.fairplay.likely7d")}
          value={overview?.likely_cheat_7d ?? 0}
          tone={(overview?.likely_cheat_7d ?? 0) > 0 ? "danger" : "default"}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("admin.fairplay.queue")}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
              statusFilter === s
                ? "african-gradient text-white border-transparent"
                : "border-[var(--border-subtle)] hover:border-africhess-gold/40"
            }`}
          >
            {statusLabel(s)}
          </button>
        ))}
      </div>

      <AdminPanel
        title={t("admin.fairplay.queue")}
        subtitle={loading ? t("common.loading") : `${cases.length} dossier(s)`}
        bodyClassName="p-0 sm:p-0"
      >
        {loading ? (
          <div className="p-5">
            <AdminSkeleton rows={4} />
          </div>
        ) : cases.length === 0 ? (
          <div className="p-5">
            <AdminEmpty>{t("admin.fairplay.noCases")}</AdminEmpty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] backdrop-blur">
                <tr className="text-[11px] uppercase tracking-wide opacity-55 border-b border-[var(--border-subtle)] text-left">
                  <th className="px-3 py-2.5 font-medium">{t("admin.fairplay.col.player")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.fairplay.col.game")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.fairplay.col.verdict")}</th>
                  <th className="px-3 py-2.5 font-medium text-right">{t("admin.fairplay.col.score")}</th>
                  <th className="px-3 py-2.5 font-medium text-right">{t("admin.fairplay.col.peerDelta")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.fairplay.col.status")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.fairplay.col.date")}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border-subtle)]/50 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] group"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/users/${c.report.user_id}`}
                        className="font-medium text-africhess-gold hover:underline"
                      >
                        {c.report.username}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <p className="truncate max-w-[180px]">
                        {c.game.white ?? "?"} vs {c.game.black ?? "?"}
                      </p>
                      <p className="text-[11px] opacity-45 uppercase">{c.game.mode}</p>
                    </td>
                    <td className="px-3 py-3">
                      <AdminBadge tone={verdictTone(c.report.verdict)}>
                        {verdictLabel(c.report.verdict)}
                      </AdminBadge>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-mono text-xs">
                      {c.report.overall_score.toFixed(1)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-mono text-xs">
                      {c.peer_score_delta.toFixed(1)}
                    </td>
                    <td className="px-3 py-3">
                      <AdminBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</AdminBadge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap opacity-70 text-xs">
                      {c.game.ended_at
                        ? formatLocaleDate(locale, c.game.ended_at, { dateStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/fairplay/games/${c.game.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-africhess-gold opacity-80 group-hover:opacity-100"
                      >
                        {t("admin.fairplay.viewGame")}
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
