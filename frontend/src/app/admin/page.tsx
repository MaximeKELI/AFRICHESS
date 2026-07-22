"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { LineChart, HorizontalBarChart } from "@/components/stats/StatsCharts";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import {
  Users,
  Activity,
  Gamepad2,
  MousePointerClick,
  Eye,
  Zap,
  ArrowRight,
  Scale,
} from "lucide-react";
import {
  AdminEmpty,
  AdminKpi,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

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
  const [pendingFp, setPendingFp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.overview(),
      adminApi.registrations(),
      adminApi.fairplayOverview().catch(() => null),
    ])
      .then(([ov, rg, fp]) => {
        setOverview(ov.data);
        setRegs(rg.data);
        setPendingFp(fp ? Number(fp.data?.pending_cases ?? 0) : null);
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

  if (loading) return <AdminSkeleton rows={8} />;
  if (error) return <InlineAlert>{error}</InlineAlert>;
  if (!overview) return null;

  const cards = [
    {
      label: t("admin.kpi.users"),
      value: overview.users.total.toLocaleString(locale),
      sub: `+${overview.users.new_7d} / 7j`,
      icon: Users,
      href: "/admin/users",
    },
    {
      label: t("admin.kpi.active"),
      value: overview.users.active_7d.toLocaleString(locale),
      sub: t("admin.kpi.activeSub"),
      icon: Activity,
    },
    {
      label: t("admin.kpi.games"),
      value: overview.games.total.toLocaleString(locale),
      sub: `+${overview.games.last_7d} / 7j`,
      icon: Gamepad2,
    },
    {
      label: t("admin.kpi.clicks"),
      value: overview.events.clicks_7d.toLocaleString(locale),
      sub: t("admin.kpi.clicksSub"),
      icon: MousePointerClick,
    },
    {
      label: t("admin.kpi.pageViews"),
      value: overview.events.page_views_7d.toLocaleString(locale),
      sub: t("admin.kpi.pageViewsSub"),
      icon: Eye,
    },
    {
      label: t("admin.kpi.events"),
      value: overview.events.total.toLocaleString(locale),
      sub: t("admin.kpi.eventsSub"),
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.nav.overview")}
        description={t("admin.subtitle")}
        actions={
          <>
            <Link
              href="/admin/tables"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-africhess-gold/40"
            >
              {t("admin.nav.tables")}
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/admin/stats"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-africhess-gold/40"
            >
              {t("admin.nav.stats")}
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/admin/data-science"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-africhess-gold/40"
            >
              {t("admin.nav.dataScience")}
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-africhess-gold/40"
            >
              {t("admin.nav.users")}
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/admin/fairplay"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:border-africhess-gold/40"
            >
              <Scale size={14} />
              {t("admin.nav.fairplay")}
              {pendingFp != null && pendingFp > 0 ? ` (${pendingFp})` : ""}
            </Link>
          </>
        }
      />

      {pendingFp != null && pendingFp > 0 && (
        <Link
          href="/admin/fairplay"
          className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm hover:border-amber-500/55"
        >
          <span>
            <strong className="tabular-nums">{pendingFp}</strong> {t("admin.overview.fairplayAlert")}
          </span>
          <ArrowRight size={16} className="shrink-0 opacity-70" />
        </Link>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <AdminKpi key={c.label} {...c} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title={t("admin.chart.signups")}>
          <LineChart points={signupSeries} height={180} />
        </AdminPanel>
        <AdminPanel title={t("admin.chart.events")}>
          <LineChart points={eventSeries} height={180} />
        </AdminPanel>
      </div>

      {regs && (
        <div className="grid lg:grid-cols-2 gap-4">
          <AdminPanel title={t("admin.chart.byCountry")}>
            {regs.by_country.length === 0 ? (
              <AdminEmpty>{t("admin.empty")}</AdminEmpty>
            ) : (
              <HorizontalBarChart
                items={regs.by_country.slice(0, 12).map((r) => ({
                  label: `${countryFlag(r.country)} ${displayCountry(r.country, locale)}`,
                  value: r.count,
                }))}
              />
            )}
          </AdminPanel>
          <AdminPanel title={t("admin.chart.byDiscovery")}>
            {regs.by_discovery_source.length === 0 ? (
              <AdminEmpty>{t("admin.empty")}</AdminEmpty>
            ) : (
              <HorizontalBarChart
                items={regs.by_discovery_source.map((r) => ({
                  label: t(`auth.register.discovery.${r.discovery_source}`) || r.discovery_source,
                  value: r.count,
                }))}
              />
            )}
          </AdminPanel>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title={t("admin.table.topPages")} bodyClassName="p-0 sm:p-0">
          {overview.top_pages.length === 0 ? (
            <div className="p-5">
              <AdminEmpty>{t("admin.empty")}</AdminEmpty>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] backdrop-blur z-10">
                  <tr className="text-left text-[11px] uppercase tracking-wide opacity-50 border-b border-[var(--border-subtle)]">
                    <th className="px-4 py-2.5 font-medium">{t("admin.col.path")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{t("admin.col.count")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.top_pages.map((row) => (
                    <tr
                      key={row.path}
                      className="border-b border-[var(--border-subtle)]/60 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                    >
                      <td className="px-4 py-2 font-mono text-xs truncate max-w-[280px]">{row.path}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {row.count.toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        <AdminPanel title={t("admin.table.topClicks")} bodyClassName="p-0 sm:p-0">
          {overview.top_clicks.length === 0 ? (
            <div className="p-5">
              <AdminEmpty>{t("admin.empty")}</AdminEmpty>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] backdrop-blur z-10">
                  <tr className="text-left text-[11px] uppercase tracking-wide opacity-50 border-b border-[var(--border-subtle)]">
                    <th className="px-4 py-2.5 font-medium">{t("admin.col.label")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("admin.col.element")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{t("admin.col.count")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.top_clicks.map((row, i) => (
                    <tr
                      key={`${row.element}-${row.path}-${i}`}
                      className="border-b border-[var(--border-subtle)]/60 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                    >
                      <td className="px-4 py-2 truncate max-w-[160px]">{row.label || "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs truncate max-w-[140px] opacity-70">
                        {row.element}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {row.count.toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
