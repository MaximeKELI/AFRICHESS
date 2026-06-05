"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { CoachPanel } from "@/components/learning/CoachPanel";
import { RecentGamesList } from "@/components/game/RecentGamesList";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";

interface Dashboard {
  profile: {
    xp: number;
    level: number;
    xp_to_next_level: number;
    puzzle_accuracy: number;
    puzzles_solved_learning: number;
    lessons_completed: number;
  };
  courses: { id: number; slug: string; title: string; level: string; description: string; lesson_count: number }[];
  progress: { course: number; course_title: string; progress_percent: number }[];
  badges: { badge: { icon: string; name: string }; earned_at: string }[];
  coach_tips: { category: string; message: string; priority: number }[];
  stats: { games_played: number; puzzles_solved: number; win_rate: number };
}

export default function LearningDashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    learningApi
      .dashboard()
      .then(({ data: d }) => {
        setData(d);
        setError(null);
      })
      .catch((err) => {
        setData(null);
        setError(formatApiError(err, t("learning.error.load")));
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold mb-4">{t("learning.title")}</h1>
        <p className="mb-6 opacity-80">{t("learning.loginRequired")}</p>
        <Link href="/login" className="px-6 py-2 rounded-lg african-gradient text-white">
          {t("learning.loginButton")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="p-8 text-center opacity-60">{t("common.loading")}</p>;
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <InlineAlert>{error ?? t("learning.error.unavailable")}</InlineAlert>
      </div>
    );
  }

  const { profile } = data;
  const xpPct = profile.xp_to_next_level
    ? Math.min(100, (profile.xp / (profile.xp + profile.xp_to_next_level)) * 100)
    : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("learning.title")}</h1>
      <p className="opacity-70 mb-4">
        Parcours complet : <strong>10 volumes</strong>, <strong>40 documents</strong> (~20 pages chacun),
        tous les plans du jeu.
      </p>
      <p className="text-sm opacity-50 mb-8">
        Commencez par le Volume 1 si vous débutez. Chaque leçon affiche le temps de lecture estimé.
      </p>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="relative">
            <ProgressRing percent={xpPct} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {profile.level}
            </span>
          </div>
          <div>
            <p className="text-sm opacity-60">{t("learning.level")}</p>
            <p className="text-2xl font-bold text-africhess-gold">{profile.xp} XP</p>
            <p className="text-xs opacity-50">
              {t("learning.xpBefore", { xp: profile.xp_to_next_level, next: profile.level + 1 })}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-africhess-green">{profile.lessons_completed}</p>
            <p className="text-xs opacity-60">Leçons</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-africhess-gold">{profile.puzzles_solved_learning}</p>
            <p className="text-xs opacity-60">Puzzles</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.puzzle_accuracy}%</p>
            <p className="text-xs opacity-60">Précision</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{data.stats.win_rate}%</p>
            <p className="text-xs opacity-60">Victoires</p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-3">Badges</h3>
          {data.badges.length === 0 ? (
            <p className="text-sm opacity-60">Jouez et apprenez pour débloquer des badges.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.badges.map((b, i) => (
                <span
                  key={i}
                  title={b.badge.name}
                  className="text-2xl p-2 rounded-lg bg-white/5"
                >
                  {b.badge.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecentGamesList />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <Link
              href="/learning/analyze"
              className="px-4 py-2 rounded-lg border border-africhess-gold text-africhess-gold hover:bg-africhess-gold/10 text-sm"
            >
              Analyser une partie (PGN)
            </Link>
            <Link
              href="/puzzles"
              className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
            >
              Puzzles tactiques
            </Link>
          </div>

          <h2 className="font-semibold text-lg mb-4">Cours</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.courses.map((c) => {
              const prog = data.progress.find((p) => p.course === c.id);
              return (
                <Link
                  key={c.id}
                  href={`/learning/courses/${c.slug}`}
                  className="glass-card p-5 hover:ring-1 hover:ring-africhess-gold/50 transition-all"
                >
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-africhess-green/20">
                    {c.level}
                  </span>
                  <h3 className="font-semibold mt-2">{c.title}</h3>
                  <p className="text-sm opacity-70 mt-1 line-clamp-2">{c.description}</p>
                  <p className="text-xs mt-3 opacity-50">
                    {c.lesson_count} leçons
                    {prog ? ` · ${prog.progress_percent}%` : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <CoachPanel tips={data.coach_tips} />
      </div>
    </div>
  );
}
