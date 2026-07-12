"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
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
  collaborators?: { username: string; role: string }[];
}

function fenFromPgn(pgn: string, fallback: string): string {
  const start =
    fallback && fallback !== "startpos"
      ? fallback
      : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  try {
    const game = new Chess();
    if (fallback && fallback !== "startpos") {
      game.load(fallback);
    }
    const trimmed = pgn.trim();
    if (trimmed) {
      // chess.js beta : loadPgn peut échouer sur PGN partiel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loader = (game as any).loadPgn?.bind(game);
      if (typeof loader === "function") {
        loader(trimmed);
      }
    }
    return game.fen();
  } catch {
    return start;
  }
}

export default function StudyDetailPage({ params }: { params: { id: string } }) {
  const { t } = useTranslation();
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [pgnDraft, setPgnDraft] = useState("");
  const [importPgn, setImportPgn] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [collabUser, setCollabUser] = useState("");
  const [ioStatus, setIoStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<StudyDetail>(`/learning/studies/${params.id}/`)
      .then(({ data }) => {
        setStudy(data);
        const ch = data.chapters[0] ?? null;
        setActiveChapter(ch);
        setPgnDraft(ch?.pgn ?? "");
      })
      .catch((err) => {
        setStudy(null);
        setError(formatApiError(err, t("studies.error.load")));
      })
      .finally(() => setLoading(false));
  }, [params.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const boardFen = useMemo(() => {
    if (!activeChapter) return "start";
    return fenFromPgn(pgnDraft || activeChapter.pgn, activeChapter.initial_fen);
  }, [activeChapter, pgnDraft]);

  const savePgn = async () => {
    if (!study || !activeChapter) return;
    try {
      await api.patch(`/learning/studies/${study.id}/chapters/${activeChapter.id}/`, {
        pgn: pgnDraft,
      });
      setIoStatus(t("studies.saved"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("studies.error.save")));
    }
  };

  const addChapter = async () => {
    if (!study || !newChapterTitle.trim()) return;
    try {
      await api.post(`/learning/studies/${study.id}/chapters/`, {
        title: newChapterTitle.trim(),
        pgn: "",
      });
      setNewChapterTitle("");
      setIoStatus(t("studies.chapterAdded"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("studies.error.chapter")));
    }
  };

  const deleteChapter = async () => {
    if (!study || !activeChapter) return;
    if (study.chapters.length <= 1) {
      setError(t("studies.error.lastChapter"));
      return;
    }
    if (!window.confirm(t("studies.deleteChapterConfirm"))) return;
    try {
      await api.delete(`/learning/studies/${study.id}/chapters/${activeChapter.id}/`);
      setIoStatus(t("studies.chapterDeleted"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("studies.error.chapter")));
    }
  };

  const inviteCollaborator = async () => {
    if (!study || !collabUser.trim()) return;
    try {
      await api.post(`/learning/studies/${study.id}/collaborators/`, {
        username: collabUser.trim(),
        role: "editor",
      });
      setCollabUser("");
      setIoStatus(t("studies.collabAdded"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("studies.error.collab")));
    }
  };

  const exportStudy = async () => {
    if (!study) return;
    try {
      const { data } = await api.get<{ pgn: string }>(`/learning/studies/${study.id}/export/`);
      const blob = new Blob([data.pgn], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${study.title.replace(/\s+/g, "-")}.pgn`;
      a.click();
      URL.revokeObjectURL(url);
      setIoStatus(t("studies.exported"));
    } catch (err) {
      setError(formatApiError(err, t("studies.error.export")));
    }
  };

  const importStudy = async () => {
    if (!study || !importPgn.trim()) return;
    try {
      await api.post(`/learning/studies/${study.id}/import/`, {
        pgn: importPgn,
        replace: false,
      });
      setImportPgn("");
      setIoStatus(t("studies.imported"));
      load();
    } catch (err) {
      setError(formatApiError(err, t("studies.error.import")));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="opacity-60">{t("common.loading")}</p>
      </div>
    );
  }

  if (error && !study) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Link href="/studies" className="text-sm opacity-60 hover:opacity-100">
          ← {t("studies.back")}
        </Link>
        <InlineAlert>{error}</InlineAlert>
      </div>
    );
  }

  if (!study) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link href="/studies" className="text-sm opacity-60 hover:opacity-100">
        ← {t("studies.back")}
      </Link>
      <h1 className="font-display text-2xl font-bold">{study.title}</h1>
      {error && (
        <InlineAlert onDismiss={() => setError(null)}>{error}</InlineAlert>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportStudy} className="px-3 py-1 rounded-lg text-sm border border-white/20">
          {t("studies.export")}
        </button>
      </div>
      {ioStatus && <p className="text-sm text-africhess-gold">{ioStatus}</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <ChessBoard fen={boardFen} disabled orientation="white" playSoundOnFenChange={false} />
        </div>
        <div className="space-y-4">
          <details className="glass-card p-3 text-sm">
            <summary className="cursor-pointer">{t("studies.import")}</summary>
            <textarea
              className="w-full h-32 mt-2 font-mono text-xs bg-black/30 rounded p-2 border border-white/10"
              value={importPgn}
              onChange={(e) => setImportPgn(e.target.value)}
              placeholder='[Event "Chapter 1"]...'
            />
            <button type="button" onClick={importStudy} className="mt-2 african-gradient px-3 py-1 rounded text-sm">
              {t("studies.importBtn")}
            </button>
          </details>

          <div className="flex flex-wrap gap-2 items-center">
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

          <div className="flex gap-2">
            <input
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              placeholder={t("studies.newChapter")}
              className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
            <button type="button" onClick={addChapter} className="px-3 py-2 rounded-lg border text-sm">
              {t("studies.addChapter")}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={collabUser}
              onChange={(e) => setCollabUser(e.target.value)}
              placeholder={t("studies.collabUsername")}
              className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
            <button type="button" onClick={inviteCollaborator} className="px-3 py-2 rounded-lg border text-sm">
              {t("studies.inviteCollab")}
            </button>
          </div>
          {(study.collaborators?.length ?? 0) > 0 && (
            <p className="text-xs opacity-60">
              {t("studies.collabs")}:{" "}
              {study.collaborators!.map((c) => `${c.username} (${c.role})`).join(", ")}
            </p>
          )}

          {activeChapter && (
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-medium">{activeChapter.title}</p>
              <textarea
                className="w-full h-48 font-mono text-sm bg-black/30 rounded-lg p-3 border border-white/10"
                value={pgnDraft}
                onChange={(e) => setPgnDraft(e.target.value)}
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={savePgn} className="african-gradient px-4 py-2 rounded-lg text-sm">
                  {t("studies.save")}
                </button>
                <button
                  type="button"
                  onClick={deleteChapter}
                  className="px-4 py-2 rounded-lg text-sm border border-white/20"
                >
                  {t("studies.deleteChapter")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
