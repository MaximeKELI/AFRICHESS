"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { DonutChart, HorizontalBarChart } from "@/components/stats/StatsCharts";
import {
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

function pct(v: number | undefined | null) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function AdminStatsPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .stats({ days })
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

  const g = data.games;
  const resultSlices = [
    { label: t("admin.stats.whiteWins"), value: g.white_wins, color: "#1B7A3D" },
    { label: t("admin.stats.blackWins"), value: g.black_wins, color: "#C45C26" },
    { label: t("admin.stats.draws"), value: g.draws, color: "#6b7280" },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t("admin.nav.stats")}
        description={t("admin.stats.subtitle")}
        actions={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-transparent text-sm"
          >
            {[7, 14, 30, 90, 180].map((d) => (
              <option key={d} value={d}>
                {t("admin.window.days", { days: d })}
              </option>
            ))}
          </select>
        }
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <AdminKpi label={t("admin.stats.gamesTotal")} value={g.total} sub={pct(g.p_completed)} />
        <AdminKpi label={t("admin.stats.pCompleted")} value={pct(g.p_completed)} />
        <AdminKpi label={t("admin.stats.pAborted")} value={pct(g.p_aborted)} tone="warn" />
        <AdminKpi label={t("admin.stats.pVsAi")} value={pct(g.p_vs_ai)} />
        <AdminKpi label={t("admin.stats.puzzleSolve")} value={pct(data.puzzles.p_solve)} />
        <AdminKpi label={t("admin.stats.login7d")} value={pct(data.users.p_logged_in_7d)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title={t("admin.stats.results")}>
          <DonutChart
            slices={resultSlices}
            centerLabel={pct(g.p_white_win)}
            centerSub="P(1-0)"
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[11px] opacity-50 uppercase">P(blancs)</p>
              <p className="font-mono font-semibold">{pct(g.p_white_win)}</p>
            </div>
            <div>
              <p className="text-[11px] opacity-50 uppercase">P(noirs)</p>
              <p className="font-mono font-semibold">{pct(g.p_black_win)}</p>
            </div>
            <div>
              <p className="text-[11px] opacity-50 uppercase">P(nulle)</p>
              <p className="font-mono font-semibold">{pct(g.p_draw)}</p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title={t("admin.stats.byMode")}>
          <HorizontalBarChart
            items={(g.by_mode || []).map((r: { mode: string; count: number }) => ({
              label: r.mode,
              value: r.count,
            }))}
          />
        </AdminPanel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title={t("admin.stats.eloDist")}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
            <div>
              <p className="text-[11px] opacity-50">n</p>
              <p className="font-mono font-semibold">{data.ratings.sample}</p>
            </div>
            <div>
              <p className="text-[11px] opacity-50">mean</p>
              <p className="font-mono font-semibold">{data.ratings.mean ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] opacity-50">p50</p>
              <p className="font-mono font-semibold">{data.ratings.p50 ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] opacity-50">p90 / p99</p>
              <p className="font-mono font-semibold">
                {data.ratings.p90 ?? "—"} / {data.ratings.p99 ?? "—"}
              </p>
            </div>
          </div>
          <HorizontalBarChart
            items={(data.ratings.histogram || []).slice(0, 16).map(
              (b: { elo_from: number; elo_to: number; count: number }) => ({
                label: `${b.elo_from}–${b.elo_to}`,
                value: b.count,
              })
            )}
          />
        </AdminPanel>

        <AdminPanel title={t("admin.stats.fairplay")}>
          <AdminKpi
            label={t("admin.stats.pLikelyCheat")}
            value={pct(data.fairplay.p_likely_cheat)}
            sub={`${data.fairplay.reports} reports`}
            tone={data.fairplay.p_likely_cheat > 0.05 ? "danger" : "ok"}
          />
          <div className="mt-4">
            <HorizontalBarChart
              items={Object.entries(data.fairplay.by_verdict || {}).map(([k, v]) => ({
                label: k,
                value: Number(v),
              }))}
            />
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
