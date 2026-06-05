"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { LineChart, HorizontalBarChart } from "@/components/stats/StatsCharts";
import { DataTable } from "@/components/stats/StatsTables";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";

interface Overview {
  users: { total: number; new_7d: number; new_30d: number; active_7d: number };
  games: { total: number; last_7d: number };
  events: { total: number; clicks_7d: number; page_views_7d: number };
  puzzles: { attempts_7d: number };
  charts: {
    signups_by_day: { day: string; count: number }[];
    events_by_day: { day: string; total: number; clicks: number; page_views: number }[];
  };
  top_pages: { path: string; count: number }[];
  top_clicks: { path: string; element: string; label: string; count: number }[];
}

interface Registrations {
  by_country: { country: string; count: number }[];
  by_gender: { gender: string; count: number }[];
  by_discovery_source: { discovery_source: string; count: number }[];
}

export default function AdminOverviewPage() {
  const { t, locale } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [regs, setRegs] = useState<Registrations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.overview(), adminApi.registrations()])
      .then(([ov, rg]) => {
        setOverview(ov.data);
        setRegs(rg.data);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [t]);

  const signupSeries = useMemo(
    () =>
      overview?.charts.signups_by_day.map((d) => ({
        x: d.day?.slice(5) ?? "",
        y: d.count,
      })) ?? [],
    [overview]
  );

  const eventSeries = useMemo(
    () =>
      overview?.charts.events_by_day.map((d) => ({
        x: d.day?.slice(5) ?? "",
        y: d.total,
      })) ?? [],
    [overview]
  );

  if (loading) return <p className="opacity-60">{t("common.loading")}</p>;
  if (error) return <InlineAlert>{error}</InlineAlert>;
  if (!overview) return null;

  const cards = [
    { label: t("admin.kpi.users"), value: overview.users.total, sub: `+${overview.users.new_7d} / 7j` },
    { label: t("admin.kpi.active"), value: overview.users.active_7d, sub: t("admin.kpi.activeSub") },
    { label: t("admin.kpi.games"), value: overview.games.total, sub: `+${overview.games.last_7d} / 7j` },
    { label: t("admin.kpi.clicks"), value: overview.events.clicks_7d, sub: t("admin.kpi.clicksSub") },
    { label: t("admin.kpi.pageViews"), value: overview.events.page_views_7d, sub: t("admin.kpi.pageViewsSub") },
    { label: t("admin.kpi.events"), value: overview.events.total, sub: t("admin.kpi.eventsSub") },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-4">
            <p className="text-2xl font-bold text-africhess-gold">{c.value.toLocaleString()}</p>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs opacity-50 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">{t("admin.chart.signups")}</h2>
          <LineChart points={signupSeries} height={180} />
        </div>
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">{t("admin.chart.events")}</h2>
          <LineChart points={eventSeries} height={180} />
        </div>
      </div>

      {regs && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h2 className="font-semibold mb-4">{t("admin.chart.byCountry")}</h2>
            <HorizontalBarChart
              items={regs.by_country.slice(0, 12).map((r) => ({
                label: `${countryFlag(r.country)} ${displayCountry(r.country, locale)}`,
                value: r.count,
              }))}
            />
          </div>
          <div className="glass-card p-6">
            <h2 className="font-semibold mb-4">{t("admin.chart.byDiscovery")}</h2>
            <HorizontalBarChart
              items={regs.by_discovery_source.map((r) => ({
                label: t(`auth.register.discovery.${r.discovery_source}`) || r.discovery_source,
                value: r.count,
              }))}
            />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">{t("admin.table.topPages")}</h2>
          <DataTable
            columns={[
              { key: "path", label: t("admin.col.path") },
              { key: "count", label: t("admin.col.count"), className: "text-right" },
            ]}
            rows={overview.top_pages}
            emptyMessage={t("admin.empty")}
          />
        </div>
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">{t("admin.table.topClicks")}</h2>
          <DataTable
            columns={[
              { key: "label", label: t("admin.col.label") },
              { key: "element", label: t("admin.col.element") },
              { key: "count", label: t("admin.col.count"), className: "text-right" },
            ]}
            rows={overview.top_clicks.map((r) => ({
              label: r.label || "—",
              element: r.element,
              count: r.count,
            }))}
            emptyMessage={t("admin.empty")}
          />
        </div>
      </div>
    </div>
  );
}
