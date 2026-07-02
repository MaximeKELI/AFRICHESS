"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface Chapter {
  id: number;
  title: string;
  order: number;
  pgn: string;
  initial_fen: string;
}

interface StudyDetail {
  id: number;
  title: string;
  description: string;
  owner: string;
  chapters: Chapter[];
}

export default function StudyDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation();
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [pgnDraft, setPgnDraft] = useState("");

  const load = useCallback(() => {
    api
      .get<StudyDetail>(`/learning/studies/${params.id}/`)
      .then(({ data }) => {
        setStudy(data);
        const ch = data.chapters[0] ?? null;
        setActiveChapter(ch);
        setPgnDraft(ch?.pgn ?? "");
      })
      .catch(() => setStudy(null));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const savePgn = async () => {
    if (!study || !activeChapter) return;
    await api.patch(`/learning/studies/${study.id}/chapters/${activeChapter.id}/`, {
      pgn: pgnDraft,
    });
    load();
  };

  if (!study) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="opacity-60">{t("common.loading") || "Chargement…"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link href="/studies" className="text-sm opacity-60 hover:opacity-100">
        ← {t("studies.back") || "Studies"}
      </Link>
      <h1 className="font-display text-2xl font-bold">{study.title}</h1>
      <div className="flex flex-wrap gap-2">
        {study.chapters.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => {
              setActiveChapter(ch);
              setPgnDraft(ch.pgn);
            }}
            className={`px-3 py-1 rounded-lg text-sm border ${
              activeChapter?.id === ch.id ? "border-africhess-gold" : "border-white/15"
            }`}
          >
            {ch.title}
          </button>
        ))}
      </div>
      {activeChapter && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-sm font-medium">{activeChapter.title}</p>
          <textarea
            className="w-full h-64 font-mono text-sm bg-black/30 rounded-lg p-3 border border-white/10"
            value={pgnDraft}
            onChange={(e) => setPgnDraft(e.target.value)}
            spellCheck={false}
          />
          <button type="button" onClick={savePgn} className="african-gradient px-4 py-2 rounded-lg text-sm">
            {t("studies.save") || "Enregistrer PGN"}
          </button>
        </div>
      )}
    </div>
  );
}
