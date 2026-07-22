"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { ArrowLeft } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminKpi,
  AdminMetaGrid,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

interface UserDetail {
  user: {
    id: number;
    username: string;
    email: string;
    country: string;
    city: string;
    gender: string;
    birth_year: number | null;
    discovery_source: string;
    registration_locale: string;
    preferred_language: string;
    chess_level: string;
    date_joined: string;
    last_login: string | null;
  };
  stats: {
    games_played: number;
    games_won: number;
    puzzles_solved: number;
    total_play_time_seconds: number;
  } | null;
  learning: {
    xp: number;
    lessons_completed: number;
    quizzes_passed: number;
  } | null;
  activity: {
    events_total: number;
    clicks_total: number;
    page_views_total: number;
    sessions_estimated: number;
    by_type: Record<string, number>;
  };
  games_total: number;
  puzzle_attempts_total: number;
  timeline: {
    total: number;
    events: {
      id: number;
      event_type: string;
      path: string;
      element: string;
      label: string;
      metadata: Record<string, unknown>;
      session_id: string;
      created_at: string;
    }[];
  };
  fairplay?: {
    by_verdict: Record<string, number>;
    baseline: {
      games_analyzed: number;
      avg_accuracy: number;
      avg_top1_rate: number;
      avg_cpl: number;
    };
    active_sanctions: { sanction_type: string; until: string | null; notes: string }[];
    recent_reports: {
      game_id: string;
      verdict: string;
      overall_score: number;
      review_status: string | null;
    }[];
  } | null;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { t, locale } = useTranslation();
  const [data, setData] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;
    adminApi
      .userDetail(id, { limit: 200 })
      .then(({ data: d }) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) return <AdminSkeleton rows={8} />;
  if (error) return <InlineAlert>{error}</InlineAlert>;
  if (!data) return null;

  const { user, stats, learning, activity, timeline } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm opacity-60 hover:opacity-100 hover:text-africhess-gold"
      >
        <ArrowLeft size={16} />
        {t("admin.user.back")}
      </Link>

      <AdminPageHeader
        title={user.username}
        description={user.email}
        actions={
          <Link
            href={`/profile/${encodeURIComponent(user.username)}`}
            className="text-sm px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-africhess-gold/40"
          >
            {t("admin.user.publicProfile")}
          </Link>
        }
      />

      <AdminPanel>
        <AdminMetaGrid
          items={[
            {
              label: t("admin.col.country"),
              value: `${countryFlag(user.country)} ${displayCountry(user.country, locale)}`,
            },
            { label: t("auth.register.city"), value: user.city || "—" },
            {
              label: t("auth.register.gender"),
              value: user.gender ? t(`auth.register.gender.${user.gender}`) : "—",
            },
            {
              label: t("auth.register.discovery"),
              value: user.discovery_source
                ? t(`auth.register.discovery.${user.discovery_source}`)
                : "—",
            },
            { label: t("auth.register.birthYear"), value: user.birth_year ?? "—" },
            {
              label: t("admin.col.joined"),
              value: formatLocaleDate(locale, user.date_joined, { dateStyle: "medium" }),
            },
            {
              label: t("admin.col.lastLogin"),
              value: user.last_login
                ? formatLocaleDate(locale, user.last_login, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—",
            },
            { label: t("admin.col.sessions"), value: activity.sessions_estimated },
          ]}
        />
      </AdminPanel>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminKpi label={t("admin.col.clicks")} value={activity.clicks_total.toLocaleString(locale)} />
        <AdminKpi
          label={t("admin.col.pageViews")}
          value={activity.page_views_total.toLocaleString(locale)}
        />
        <AdminKpi label={t("admin.col.events")} value={activity.events_total.toLocaleString(locale)} />
        <AdminKpi
          label={t("admin.col.games")}
          value={(stats?.games_played ?? data.games_total).toLocaleString(locale)}
        />
        <AdminKpi
          label={t("admin.col.puzzles")}
          value={(stats?.puzzles_solved ?? data.puzzle_attempts_total).toLocaleString(locale)}
        />
        <AdminKpi label="XP" value={(learning?.xp ?? 0).toLocaleString(locale)} />
      </div>

      {Object.keys(activity.by_type).length > 0 && (
        <AdminPanel title={t("admin.user.byType")}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(activity.by_type)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <AdminBadge key={type} tone="neutral">
                  {type}: <strong className="tabular-nums ml-0.5">{count}</strong>
                </AdminBadge>
              ))}
          </div>
        </AdminPanel>
      )}

      {data.fairplay && (
        <AdminPanel title={t("admin.fairplay.userSection")}>
          <div className="space-y-4">
            {data.fairplay.baseline.games_analyzed >= 5 && (
              <p className="text-sm opacity-70">
                {t("admin.fairplay.baseline")}: top1{" "}
                {(data.fairplay.baseline.avg_top1_rate * 100).toFixed(1)}% · accuracy{" "}
                {data.fairplay.baseline.avg_accuracy.toFixed(1)} · CPL{" "}
                {data.fairplay.baseline.avg_cpl.toFixed(0)} ({data.fairplay.baseline.games_analyzed}{" "}
                parties)
              </p>
            )}
            {data.fairplay.active_sanctions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-500 mb-1">
                  {t("admin.fairplay.activeSanctions")}
                </p>
                <ul className="text-xs space-y-1 opacity-80">
                  {data.fairplay.active_sanctions.map((s, i) => (
                    <li key={i}>
                      {s.sanction_type}
                      {s.until ? ` → ${s.until}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.fairplay.recent_reports.length > 0 ? (
              <ul className="text-sm space-y-2">
                {data.fairplay.recent_reports.map((r) => (
                  <li key={r.game_id} className="flex flex-wrap items-center gap-2">
                    <AdminBadge
                      tone={
                        r.verdict === "likely_cheat"
                          ? "danger"
                          : r.verdict === "clean"
                            ? "ok"
                            : "warn"
                      }
                    >
                      {r.verdict}
                    </AdminBadge>
                    <Link
                      href={`/admin/fairplay/games/${r.game_id}`}
                      className="text-africhess-gold hover:underline"
                    >
                      score {r.overall_score.toFixed(1)}
                    </Link>
                    {r.review_status && (
                      <span className="text-xs opacity-50">({r.review_status})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-50">—</p>
            )}
          </div>
        </AdminPanel>
      )}

      <AdminPanel
        title={`${t("admin.user.timeline")} (${timeline.total})`}
        bodyClassName="p-0 sm:p-0"
      >
        {timeline.events.length === 0 ? (
          <div className="p-5">
            <AdminEmpty>{t("admin.user.noEvents")}</AdminEmpty>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] backdrop-blur">
                <tr className="text-[11px] uppercase tracking-wide opacity-55 border-b border-[var(--border-subtle)] text-left">
                  <th className="px-3 py-2.5 font-medium">{t("admin.col.time")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.col.type")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.col.path")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.col.element")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("admin.col.label")}</th>
                </tr>
              </thead>
              <tbody>
                {timeline.events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-[var(--border-subtle)]/50 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] font-mono text-xs"
                  >
                    <td className="px-3 py-2 whitespace-nowrap opacity-70">
                      {formatLocaleDate(locale, ev.created_at, {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <AdminBadge tone="neutral">{ev.event_type}</AdminBadge>
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{ev.path || "—"}</td>
                    <td className="px-3 py-2 max-w-[160px] truncate opacity-70">
                      {ev.element || "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[160px] truncate">{ev.label || "—"}</td>
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
