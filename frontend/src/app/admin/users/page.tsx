"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { Search, ArrowUpRight } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  country: string;
  date_joined: string;
  last_login: string | null;
  events_total: number;
  clicks_total: number;
  games_played: number;
  discovery_source: string;
}

type SortKey = "username" | "joined" | "clicks" | "events" | "games";

export default function AdminUsersPage() {
  const { t, locale } = useTranslation();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    adminApi
      .users({ q: search, limit: 100 })
      .then(({ data }) => {
        setUsers(data.users);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [search, t]);

  const sorted = useMemo(() => {
    const list = [...users];
    const mul = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "username":
          return mul * a.username.localeCompare(b.username);
        case "joined":
          return mul * (new Date(a.date_joined).getTime() - new Date(b.date_joined).getTime());
        case "clicks":
          return mul * (a.clicks_total - b.clicks_total);
        case "events":
          return mul * (a.events_total - b.events_total);
        case "games":
          return mul * (a.games_played - b.games_played);
        default:
          return 0;
      }
    });
    return list;
  }, [users, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "username" ? "asc" : "desc");
    }
  };

  const SortTh = ({
    label,
    k,
    align = "left",
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
  }) => (
    <th className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-africhess-gold"
      >
        {label}
        {sortKey === k && <span className="opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t("admin.nav.users")}
        description={t("admin.users.count", { count: total })}
      />

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.users.search")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-transparent focus:border-africhess-gold focus:outline-none focus:ring-1 focus:ring-africhess-gold/40"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl african-gradient text-white text-sm font-medium shrink-0"
        >
          {t("admin.users.searchBtn")}
        </button>
      </form>

      {error && <InlineAlert>{error}</InlineAlert>}
      {loading && <AdminSkeleton rows={6} />}

      {!loading && (
        <AdminPanel bodyClassName="p-0 sm:p-0">
          {sorted.length === 0 ? (
            <div className="p-5">
              <AdminEmpty>{t("admin.empty")}</AdminEmpty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] backdrop-blur">
                  <tr className="text-[11px] uppercase tracking-wide opacity-55 border-b border-[var(--border-subtle)]">
                    <SortTh label={t("admin.col.user")} k="username" />
                    <th className="px-3 py-2.5 font-medium text-left">{t("admin.col.country")}</th>
                    <SortTh label={t("admin.col.joined")} k="joined" />
                    <SortTh label={t("admin.col.clicks")} k="clicks" align="right" />
                    <SortTh label={t("admin.col.events")} k="events" align="right" />
                    <SortTh label={t("admin.col.games")} k="games" align="right" />
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[var(--border-subtle)]/50 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] group"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium leading-tight">{u.username}</p>
                        <p className="text-xs opacity-45 truncate max-w-[220px]">{u.email}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden>{countryFlag(u.country)}</span>
                          <span className="opacity-80">{displayCountry(u.country, locale)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 opacity-70 whitespace-nowrap">
                        {formatLocaleDate(locale, u.date_joined, { dateStyle: "short" })}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-mono text-xs">
                        {u.clicks_total.toLocaleString(locale)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-mono text-xs">
                        {u.events_total.toLocaleString(locale)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <AdminBadge tone={u.games_played > 0 ? "ok" : "neutral"}>
                          {u.games_played.toLocaleString(locale)}
                        </AdminBadge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="inline-flex items-center gap-1 text-africhess-gold text-xs font-medium opacity-80 group-hover:opacity-100"
                        >
                          {t("admin.users.detail")}
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
      )}
    </div>
  );
}
