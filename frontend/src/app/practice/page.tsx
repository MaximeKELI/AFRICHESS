"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

interface StudyRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  chapter_count: number;
  completed_count: number;
}

interface SectionRow {
  slug: string;
  name: string;
  studies: StudyRow[];
}

export default function PracticeHubPage() {
  const { t } = useTranslation();
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learningApi
      .practice()
      .then(({ data }) => setSections(data.sections || []))
      .catch((err) => setError(formatApiError(err, t("practice.empty"))))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Link href="/learn" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.chessBasics")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("practice.title")}</h1>
        <p className="text-sm opacity-70 mt-1">{t("practice.subtitle")}</p>
        <p className="text-xs opacity-40 mt-2">{t("practice.attribution")}</p>
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      {loading ? (
        <LoadingState />
      ) : sections.length === 0 ? (
        <EmptyState>{t("practice.empty")}</EmptyState>
      ) : (
        sections.map((sec) => (
          <section key={sec.slug} className="space-y-3">
            <h2 className="font-semibold text-lg">{sec.name}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {sec.studies.map((st) => (
                <Link
                  key={st.slug}
                  href={`/practice/${st.slug}`}
                  className="glass-card p-4 hover:border-africhess-gold/50 border border-transparent transition-colors"
                >
                  <p className="font-semibold">{st.title}</p>
                  <p className="text-xs opacity-60 mt-1">{st.description}</p>
                  <p className="text-xs text-africhess-gold mt-2">
                    {t("practice.progress", {
                      done: st.completed_count,
                      total: st.chapter_count,
                    })}{" "}
                    · {t("practice.chapters", { n: st.chapter_count })}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
