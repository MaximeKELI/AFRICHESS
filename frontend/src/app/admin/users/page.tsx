"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { Search } from "lucide-react";

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

export default function AdminUsersPage() {
  const { t, locale } = useTranslation();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
        }}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.users.search")}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-transparent"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg african-gradient text-white text-sm">
          {t("admin.users.searchBtn")}
        </button>
      </form>

      {error && <InlineAlert>{error}</InlineAlert>}
      {loading && <p className="opacity-60">{t("common.loading")}</p>}

      <p className="text-sm opacity-60">
        {t("admin.users.count", { count: total })}
      </p>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-4">{t("admin.col.user")}</th>
              <th className="p-4">{t("admin.col.country")}</th>
              <th className="p-4">{t("admin.col.joined")}</th>
              <th className="p-4 text-right">{t("admin.col.clicks")}</th>
              <th className="p-4 text-right">{t("admin.col.events")}</th>
              <th className="p-4 text-right">{t("admin.col.games")}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs opacity-50">{u.email}</p>
                </td>
                <td className="p-4">
                  {countryFlag(u.country)} {displayCountry(u.country, locale)}
                </td>
                <td className="p-4 opacity-70">
                  {formatLocaleDate(locale, u.date_joined, { dateStyle: "short" })}
                </td>
                <td className="p-4 text-right font-mono">{u.clicks_total}</td>
                <td className="p-4 text-right font-mono">{u.events_total}</td>
                <td className="p-4 text-right font-mono">{u.games_played}</td>
                <td className="p-4 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-africhess-gold hover:underline text-sm"
                  >
                    {t("admin.users.detail")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <p className="p-8 text-center opacity-60">{t("admin.empty")}</p>
        )}
      </div>
    </div>
  );
}
