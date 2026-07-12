"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { puzzlesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

function themeLabel(t: (key: string) => string, theme: string): string {
  const key = `puzzles.theme.${theme}`;
  const label = t(key);
  return label === key ? theme.replace(/_/g, " ") : label;
}

export default function PuzzleThemesPage() {
  const { t } = useTranslation();
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    puzzlesApi
      .themes()
      .then(({ data }) => {
        const list = Array.isArray(data?.themes) ? data.themes : [];
        setThemes(list);
      })
      .catch((err) => setError(formatApiError(err, t("puzzles.themesPage.empty"))))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("puzzles.themesPage.title")}</h1>
      <p className="text-sm opacity-70 mb-8">{t("puzzles.themesPage.subtitle")}</p>
      {error && <InlineAlert className="mb-6">{error}</InlineAlert>}
      {loading ? (
        <LoadingState />
      ) : themes.length === 0 ? (
        <EmptyState>{t("puzzles.themesPage.empty")}</EmptyState>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {themes.map((theme) => (
            <Link
              key={theme}
              href={`/puzzles?mode=training&theme=${encodeURIComponent(theme)}`}
              className="glass-card p-4 hover:border-africhess-gold/50 border border-transparent transition-colors"
            >
              <span className="font-semibold capitalize">{themeLabel(t, theme)}</span>
              <span className="block text-xs opacity-50 mt-1 font-mono">{theme}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
