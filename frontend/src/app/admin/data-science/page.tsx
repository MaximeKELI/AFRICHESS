"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { HorizontalBarChart, LineChart } from "@/components/stats/StatsCharts";
import {
  AdminBadge,
  AdminEmpty,
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

function pct(v: number | undefined | null) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function AdminDataSciencePage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(60);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .dataScience({ days })
      .then(({ data: d }) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [days, t]);

  if (loading && !data) return <AdminSkeleton rows={8} />;
  if (error && !data) return <InlineAlert>{error}</InlineAlert>;
  if (!data) return null;

  const activitySeries = (data.activity_daily || []).map(
    (d: { day: string; events: number }) => ({
      x: d.day?.slice(5) ?? "",
      y: d.events,
    })
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t("admin.nav.dataScience")}
        description={t("admin.ds.subtitle")}
        actions={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-transparent text-sm"
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {t("admin.window.days", { days: d })}
              </option>
            ))}
          </select>
        }
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(data.retention || []).map((r: { day: number; rate: number; cohort_size: number }) => (
          <AdminKpi
            key={r.day}
            label={`D${r.day}`}
            value={pct(r.rate)}
            sub={`${r.cohort_size} users`}
            tone={r.rate < 0.1 ? "warn" : "ok"}
          />
        ))}
      </div>

      <AdminPanel title={t("admin.ds.funnel")}>
        <ol className="space-y-3">
          {(data.funnel || []).map(
            (
              step: {
                step: string;
                count: number;
                rate_from_start: number;
                rate_from_prev?: number;
              },
              i: number
            ) => (
              <li
                key={step.step}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3"
              >
                <AdminBadge tone="gold">{i + 1}</AdminBadge>
                <span className="font-medium min-w-[140px]">{t(`admin.ds.funnel.${step.step}`)}</span>
                <span className="font-mono tabular-nums">{step.count}</span>
                <span className="text-sm opacity-60">{pct(step.rate_from_start)} start</span>
                {step.rate_from_prev != null && i > 0 && (
                  <span className="text-sm opacity-60">{pct(step.rate_from_prev)} prev</span>
                )}
                <div className="w-full h-2 rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] overflow-hidden">
                  <div
                    className="h-full african-gradient"
                    style={{ width: `${Math.max(2, (step.rate_from_start || 0) * 100)}%` }}
                  />
                </div>
              </li>
            )
          )}
        </ol>
      </AdminPanel>

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title={t("admin.ds.cohorts")} bodyClassName="p-0 sm:p-0">
          {(data.cohorts || []).length === 0 ? (
            <div className="p-5">
              <AdminEmpty>{t("admin.empty")}</AdminEmpty>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--card)_96%,transparent)]">
                  <tr className="text-[11px] uppercase tracking-wide opacity-55 border-b border-[var(--border-subtle)] text-left">
                    <th className="px-3 py-2">Week</th>
                    <th className="px-3 py-2 text-right">Signups</th>
                    <th className="px-3 py-2 text-right">Played</th>
                    <th className="px-3 py-2 text-right">Activation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map(
                    (c: {
                      week: string;
                      signups: number;
                      played_game: number;
                      activation_rate: number;
                    }) => (
                      <tr key={c.week} className="border-b border-[var(--border-subtle)]/50">
                        <td className="px-3 py-2 font-mono text-xs">{c.week}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.signups}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.played_game}</td>
                        <td className="px-3 py-2 text-right font-mono">{pct(c.activation_rate)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        <AdminPanel title={t("admin.ds.activity")}>
          <LineChart points={activitySeries} height={200} />
        </AdminPanel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <AdminPanel title={t("admin.ds.corr.level")}>
          <HorizontalBarChart
            items={(data.correlations?.chess_level_vs_games || []).map(
              (r: { chess_level: string; users: number; avg_games: number | null }) => ({
                label: `${r.chess_level} (μ=${(r.avg_games ?? 0).toFixed(1)})`,
                value: r.users,
              })
            )}
          />
        </AdminPanel>
        <AdminPanel title={t("admin.ds.corr.discovery")}>
          <HorizontalBarChart
            items={(data.correlations?.discovery_vs_games || []).map(
              (r: { discovery_source: string; users: number; avg_games: number | null }) => ({
                label: `${r.discovery_source} (μ=${(r.avg_games ?? 0).toFixed(1)})`,
                value: r.users,
              })
            )}
          />
        </AdminPanel>
        <AdminPanel title={t("admin.ds.corr.country")}>
          <HorizontalBarChart
            items={(data.correlations?.country_vs_games || []).map(
              (r: { country: string; users: number; avg_games: number | null }) => ({
                label: `${r.country} (μ=${(r.avg_games ?? 0).toFixed(1)})`,
                value: r.users,
              })
            )}
          />
        </AdminPanel>
      </div>

      <AdminPanel title={t("admin.ds.puzzleDiff")}>
        <HorizontalBarChart
          items={(data.puzzle_difficulty || []).map(
            (r: { difficulty: string; attempts: number; p_solve: number }) => ({
              label: `${r.difficulty} · ${pct(r.p_solve)}`,
              value: r.attempts,
            })
          )}
        />
      </AdminPanel>
    </div>
  );
}
