"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { puzzlesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

interface DashboardData {
  puzzle_elo: number;
  daily_streak: number;
  solved_today: boolean;
  solved_count: number;
  best_streak_run: number;
  last_30_days: {
    solved: number;
    failed: number;
    total: number;
    accuracy: number | null;
  };
  recent_attempts: Array<{
    puzzle_id: number;
    solved: boolean;
    time_seconds: number;
    created_at: string;
    themes: string[];
    difficulty: string;
    rating: number;
  }>;
}

export default function PuzzleDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    puzzlesApi
      .dashboard()
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(formatApiError(err, t("puzzles.dashboard.error"))))
      .finally(() => setLoading(false));
  }, [user, t]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("puzzles.dashboard.login")}</p>
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("puzzles.dashboard.title")}</h1>
      <p className="text-sm opacity-70 mb-8">{t("puzzles.dashboard.subtitle")}</p>
      {error && <InlineAlert className="mb-6">{error}</InlineAlert>}
      {loading ? (
        <LoadingState />
      ) : data ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            <div className="glass-card p-4">
              <p className="text-xs opacity-60 mb-1">{t("puzzles.dashboard.elo")}</p>
              <p className="text-2xl font-mono text-africhess-gold">{data.puzzle_elo}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs opacity-60 mb-1">{t("puzzles.dashboard.dailyStreak")}</p>
              <p className="text-2xl font-mono">{data.daily_streak}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs opacity-60 mb-1">{t("puzzles.dashboard.bestStreak")}</p>
              <p className="text-2xl font-mono">{data.best_streak_run}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs opacity-60 mb-1">{t("puzzles.dashboard.solved")}</p>
              <p className="text-2xl font-mono">{data.solved_count}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs opacity-60 mb-1">{t("puzzles.dashboard.attempts30")}</p>
              <p className="text-2xl font-mono">{data.last_30_days.total}</p>
              <p className="text-xs opacity-50 mt-1">
                ✓ {data.last_30_days.solved} · ✗ {data.last_30_days.failed}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs opacity-60 mb-1">{t("puzzles.dashboard.accuracy30")}</p>
              <p className="text-2xl font-mono">
                {data.last_30_days.accuracy != null ? `${data.last_30_days.accuracy}%` : "—"}
              </p>
            </div>
          </div>

          <h2 className="font-semibold mb-4">{t("puzzles.dashboard.recent")}</h2>
          {data.recent_attempts.length === 0 ? (
            <EmptyState>{t("puzzles.dashboard.empty")}</EmptyState>
          ) : (
            <ul className="space-y-2">
              {data.recent_attempts.map((a) => (
                <li
                  key={`${a.puzzle_id}-${a.created_at}`}
                  className="glass-card p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    <span className={a.solved ? "text-africhess-green" : "text-red-400"}>
                      {a.solved ? "✓" : "✗"}
                    </span>{" "}
                    #{a.puzzle_id} · {a.difficulty} · {a.rating}
                    {a.themes?.length ? (
                      <span className="opacity-50 ml-2">{a.themes.slice(0, 3).join(", ")}</span>
                    ) : null}
                  </span>
                  <Link
                    href={`/puzzles?mode=training&puzzle=${a.puzzle_id}`}
                    className="text-africhess-gold text-xs underline"
                  >
                    {t("puzzles.dashboard.replay")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
