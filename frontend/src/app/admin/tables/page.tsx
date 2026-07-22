"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
} from "@/components/admin/AdminPrimitives";

interface CatalogItem {
  id: string;
  label: string;
}

export default function AdminTablesPage() {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [table, setTable] = useState("games");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    adminApi
      .tablesCatalog()
      .then(({ data }) => {
        const tables = data.tables ?? [];
        setCatalog(tables);
        if (tables.length && !tables.find((x: CatalogItem) => x.id === table)) {
          setTable(tables[0].id);
        }
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))));
  }, [t, table]);

  useEffect(() => {
    setLoading(true);
    adminApi
      .tableRows(table, { q: search, limit, offset })
      .then(({ data }) => {
        setColumns(data.columns ?? []);
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("admin.error.load"))))
      .finally(() => setLoading(false));
  }, [table, search, offset, t]);

  const cell = (v: unknown) => {
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return v ? "✓" : "—";
    if (Array.isArray(v)) return v.slice(0, 4).join(", ");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t("admin.nav.tables")}
        description={t("admin.tables.subtitle")}
      />

      <div className="flex flex-wrap gap-1.5">
        {catalog.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTable(item.id);
              setOffset(0);
              setSearch("");
              setQ("");
            }}
            className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
              table === item.id
                ? "african-gradient text-white border-transparent"
                : "border-[var(--border-subtle)] hover:border-africhess-gold/40"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setSearch(q.trim());
        }}
      >
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.tables.search")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-transparent focus:border-africhess-gold focus:outline-none"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl african-gradient text-white text-sm">
          {t("admin.users.searchBtn")}
        </button>
      </form>

      {error && <InlineAlert>{error}</InlineAlert>}

      <AdminPanel
        title={catalog.find((c) => c.id === table)?.label || table}
        subtitle={t("admin.tables.count", { count: total })}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={offset <= 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-30"
              aria-label="Prev"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-30"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
        bodyClassName="p-0 sm:p-0"
      >
        {loading ? (
          <div className="p-5">
            <AdminSkeleton rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <AdminEmpty>{t("admin.empty")}</AdminEmpty>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] backdrop-blur">
                <tr className="text-[11px] uppercase tracking-wide opacity-55 border-b border-[var(--border-subtle)] text-left">
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2.5 font-medium whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle)]/50 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                  >
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap max-w-[220px] truncate font-mono text-xs">
                        {cell(row[c])}
                      </td>
                    ))}
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
