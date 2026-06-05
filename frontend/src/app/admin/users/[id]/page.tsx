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

  if (loading) return <p className="opacity-60">{t("common.loading")}</p>;
  if (error) return <InlineAlert>{error}</InlineAlert>;
  if (!data) return null;

  const { user, stats, learning, activity, timeline } = data;

  return (
    <div className="space-y-8">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft size={16} />
        {t("admin.user.back")}
      </Link>

      <div className="glass-card p-6">
        <h2 className="font-display text-2xl font-bold mb-2">{user.username}</h2>
        <p className="opacity-60 mb-4">{user.email}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="opacity-50">{t("admin.col.country")}</span>
            <p>{countryFlag(user.country)} {displayCountry(user.country, locale)}</p>
          </div>
          <div>
            <span className="opacity-50">{t("auth.register.city")}</span>
            <p>{user.city || "—"}</p>
          </div>
          <div>
            <span className="opacity-50">{t("auth.register.gender")}</span>
            <p>{user.gender ? t(`auth.register.gender.${user.gender}`) : "—"}</p>
          </div>
          <div>
            <span className="opacity-50">{t("auth.register.discovery")}</span>
            <p>
              {user.discovery_source
                ? t(`auth.register.discovery.${user.discovery_source}`)
                : "—"}
            </p>
          </div>
          <div>
            <span className="opacity-50">{t("auth.register.birthYear")}</span>
            <p>{user.birth_year ?? "—"}</p>
          </div>
          <div>
            <span className="opacity-50">{t("admin.col.joined")}</span>
            <p>{formatLocaleDate(locale, user.date_joined, { dateStyle: "medium" })}</p>
          </div>
          <div>
            <span className="opacity-50">{t("admin.col.lastLogin")}</span>
            <p>
              {user.last_login
                ? formatLocaleDate(locale, user.last_login, { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>
          <div>
            <span className="opacity-50">{t("admin.col.sessions")}</span>
            <p>{activity.sessions_estimated}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: t("admin.col.clicks"), value: activity.clicks_total },
          { label: t("admin.col.pageViews"), value: activity.page_views_total },
          { label: t("admin.col.events"), value: activity.events_total },
          { label: t("admin.col.games"), value: stats?.games_played ?? data.games_total },
          { label: t("admin.col.puzzles"), value: stats?.puzzles_solved ?? data.puzzle_attempts_total },
          { label: "XP", value: learning?.xp ?? 0 },
        ].map((k) => (
          <div key={k.label} className="glass-card p-4 text-center">
            <p className="text-xl font-bold text-africhess-gold">{k.value}</p>
            <p className="text-xs opacity-60">{k.label}</p>
          </div>
        ))}
      </div>

      {Object.keys(activity.by_type).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">{t("admin.user.byType")}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(activity.by_type).map(([type, count]) => (
              <span
                key={type}
                className="px-3 py-1 rounded-full text-xs border border-white/15 bg-white/5"
              >
                {type}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <h3 className="font-semibold p-4 border-b border-white/10">
          {t("admin.user.timeline")} ({timeline.total})
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-3">{t("admin.col.time")}</th>
              <th className="p-3">{t("admin.col.type")}</th>
              <th className="p-3">{t("admin.col.path")}</th>
              <th className="p-3">{t("admin.col.element")}</th>
              <th className="p-3">{t("admin.col.label")}</th>
            </tr>
          </thead>
          <tbody>
            {timeline.events.map((ev) => (
              <tr key={ev.id} className="border-b border-white/5 hover:bg-white/5 font-mono text-xs">
                <td className="p-3 whitespace-nowrap opacity-70">
                  {formatLocaleDate(locale, ev.created_at, {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-white/10">{ev.event_type}</span>
                </td>
                <td className="p-3 max-w-[200px] truncate">{ev.path || "—"}</td>
                <td className="p-3 max-w-[160px] truncate">{ev.element || "—"}</td>
                <td className="p-3 max-w-[160px] truncate">{ev.label || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {timeline.events.length === 0 && (
          <p className="p-8 text-center opacity-60">{t("admin.user.noEvents")}</p>
        )}
      </div>
    </div>
  );
}
