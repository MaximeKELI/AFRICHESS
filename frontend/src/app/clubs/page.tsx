"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { formatApiError } from "@/lib/errors";
import { Plus } from "lucide-react";

interface Club {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
  is_member?: boolean;
}

export default function ClubsPage() {
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", country: "" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    socialApi
      .clubs()
      .then(({ data }) => setClubs(Array.isArray(data) ? data : data.results ?? []))
      .catch((err) => setError(formatApiError(err, t("clubs.error.load"))));
  };

  useEffect(() => {
    load();
  }, [t]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      await socialApi.createClub(form);
      setForm({ name: "", description: "", country: "" });
      setShowCreate(false);
      load();
    } catch (err) {
      setError(formatApiError(err, t("clubs.error.create")));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">{t("clubs.title")}</h1>
        {user && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border hover:border-africhess-gold"
          >
            <Plus size={16} />
            {t("clubs.create")}
          </button>
        )}
      </div>

      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}
      {!user && <p className="mb-4 opacity-70">{t("clubs.loginHint")}</p>}

      {showCreate && user && (
        <form onSubmit={handleCreate} className="glass-card p-5 mb-6 space-y-3">
          <input
            required
            placeholder={t("clubs.form.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border bg-transparent"
          />
          <textarea
            placeholder={t("clubs.form.description")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border bg-transparent min-h-[80px]"
          />
          <input
            placeholder={t("clubs.form.country")}
            maxLength={2}
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
            className="w-24 px-4 py-2 rounded-lg border bg-transparent uppercase"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
          >
            {creating ? t("clubs.creating") : t("clubs.createSubmit")}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {clubs.map((c) => (
          <Link
            key={c.id}
            href={`/clubs/${c.slug}`}
            className="glass-card p-5 block hover:ring-2 ring-africhess-gold/30 transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-lg">{c.name}</h2>
              {c.is_member && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-africhess-green/20 text-africhess-green shrink-0">
                  {t("clubs.member")}
                </span>
              )}
            </div>
            <p className="text-sm opacity-70 mt-1 line-clamp-2">{c.description || "—"}</p>
            <p className="text-xs mt-2 opacity-50">
              {t("clubs.members", { count: c.member_count })}
              {c.country && ` · ${countryFlag(c.country)} ${displayCountry(c.country, locale)}`}
            </p>
          </Link>
        ))}
        {clubs.length === 0 && <p className="opacity-60">{t("clubs.empty")}</p>}
      </div>
    </div>
  );
}
