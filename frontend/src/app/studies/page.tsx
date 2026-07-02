"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { BookMarked } from "lucide-react";

interface StudySummary {
  id: number;
  title: string;
  description: string;
  visibility: string;
  owner: string;
  chapter_count: number;
  updated_at: string;
}

export default function StudiesPage() {
  const { t } = useTranslation();
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .get<StudySummary[]>("/learning/studies/")
      .then(({ data }) => setStudies(data))
      .catch(() => setStudies([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createStudy = async () => {
    const title = window.prompt(t("studies.newTitle") || "Titre de l'étude");
    if (!title) return;
    await api.post("/learning/studies/", { title, visibility: "private" });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <BookMarked className="text-africhess-gold" />
          {t("studies.title") || "Studies"}
        </h1>
        <button type="button" onClick={createStudy} className="african-gradient px-4 py-2 rounded-lg text-sm">
          {t("studies.create") || "Nouvelle étude"}
        </button>
      </div>
      <p className="opacity-70 text-sm">
        {t("studies.subtitle") || "Chapitres PGN partagés — parité Lichess Studies v1."}
      </p>
      {loading ? (
        <p className="opacity-60">{t("common.loading") || "Chargement…"}</p>
      ) : studies.length === 0 ? (
        <p className="opacity-60">{t("studies.empty") || "Aucune étude."}</p>
      ) : (
        <ul className="space-y-3">
          {studies.map((s) => (
            <li key={s.id}>
              <Link href={`/studies/${s.id}`} className="glass-card block p-4 hover:border-africhess-gold/40">
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs opacity-50 mt-1">
                  {s.owner} · {s.chapter_count} ch. · {s.visibility}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
