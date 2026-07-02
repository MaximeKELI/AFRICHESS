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
  const [importPgn, setImportPgn] = useState("");
  const [ioStatus, setIoStatus] = useState("");

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

  const exportStudy = async () => {
    if (!study) return;
    const { data } = await api.get<{ pgn: string }>(`/learning/studies/${study.id}/export/`);
    const blob = new Blob([data.pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${study.title.replace(/\s+/g, "-")}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    setIoStatus(t("studies.exported") || "Exporté");
  };

  const importStudy = async () => {
    if (!study || !importPgn.trim()) return;
    await api.post(`/learning/studies/${study.id}/import/`, {
      pgn: importPgn,
      replace: false,
    });
    setImportPgn("");
    setIoStatus(t("studies.imported") || "Importé");
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
        <button type="button" onClick={exportStudy} className="px-3 py-1 rounded-lg text-sm border border-white/20">
          {t("studies.export") || "Exporter PGN"}
        </button>
      </div>
      {ioStatus && <p className="text-sm text-africhess-gold">{ioStatus}</p>}
      <details className="glass-card p-3 text-sm">
        <summary className="cursor-pointer">{t("studies.import") || "Importer PGN Lichess"}</summary>
        <textarea
          className="w-full h-32 mt-2 font-mono text-xs bg-black/30 rounded p-2 border border-white/10"
          value={importPgn}
          onChange={(e) => setImportPgn(e.target.value)}
          placeholder="[Event &quot;Chapter 1&quot;]..."
        />
        <button type="button" onClick={importStudy} className="mt-2 african-gradient px-3 py-1 rounded text-sm">
          {t("studies.importBtn") || "Importer"}
        </button>
      </details>
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
