"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { learningApi } from "@/lib/learningApi";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { LoadingState } from "@/components/ui/LoadingState";

interface ChapterRow {
  id: number;
  title: string;
  order: number;
  goal: string;
  goal_moves: number | null;
  completed: boolean;
}

export default function PracticeStudyPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = String(params.studySlug || "");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    learningApi
      .practiceStudy(slug)
      .then(({ data }) => {
        setTitle(data.title);
        setDesc(data.description || "");
        setChapters(data.chapters || []);
      })
      .catch((err) => setError(formatApiError(err, t("practice.empty"))))
      .finally(() => setLoading(false));
  }, [slug, t]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/practice" className="text-sm text-africhess-gold hover:underline">
        ← {t("practice.back")}
      </Link>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <InlineAlert>{error}</InlineAlert>
      ) : (
        <>
          <div>
            <h1 className="font-display text-3xl font-bold">{title}</h1>
            {desc && <p className="text-sm opacity-70 mt-1">{desc}</p>}
          </div>
          <ol className="space-y-2">
            {chapters.map((ch, i) => (
              <li key={ch.id}>
                <Link
                  href={`/practice/${slug}/${ch.id}`}
                  className="glass-card p-3 flex justify-between gap-2 text-sm hover:border-africhess-gold/40 border border-transparent"
                >
                  <span>
                    {i + 1}. {ch.title}
                    {ch.completed && (
                      <span className="ml-2 text-africhess-green text-xs">✓</span>
                    )}
                  </span>
                  <span className="opacity-50 text-xs shrink-0">{ch.goal}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
