"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MoveComment } from "@/lib/chessDisplay";
import { initAiSpeech, isAiSpeechSupported, speakComment, stopAiSpeech, unlockAiSpeech, testAiSpeech } from "@/lib/aiSpeech";
import { useTranslation } from "@/hooks/useTranslation";

interface AiCommentaryPanelProps {
  comments: MoveComment[];
  enabled: boolean;
  compact?: boolean;
  /** Lit automatiquement chaque nouveau commentaire (partie vs IA). */
  autoSpeak?: boolean;
}

export function AiCommentaryPanel({
  comments,
  enabled,
  compact = false,
  autoSpeak = false,
}: AiCommentaryPanelProps) {
  const { t } = useTranslation();
  const latest = comments.at(-1);
  const latestAi = [...comments].reverse().find((c) => c.byAi);
  const voiceSupported = isAiSpeechSupported();
  const spokenCountRef = useRef(0);

  const handleTestVoice = () => {
    unlockAiSpeech();
    void testAiSpeech(t("comments.voice.testPhrase"));
  };

  const handleListenLatest = () => {
    unlockAiSpeech();
    if (latest) {
      speakComment(latest.text, { byAi: latest.byAi, enabled: true, forceUnlock: true });
    }
  };

  useEffect(() => {
    initAiSpeech();
    return () => stopAiSpeech();
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAiSpeech();
      spokenCountRef.current = 0;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !autoSpeak || comments.length <= spokenCountRef.current) return;

    const newComments = comments.slice(spokenCountRef.current);
    spokenCountRef.current = comments.length;

    newComments.forEach((comment, index) => {
      void speakComment(comment.text, {
        byAi: comment.byAi,
        enabled: true,
        forceUnlock: index === 0,
        interrupt: index === 0,
      });
    });
  }, [comments, enabled, autoSpeak]);

  if (!enabled) {
    return (
      <div className={compact ? "text-xs opacity-50" : "text-sm opacity-60"}>
        Activez les commentaires : l&apos;IA parle et commente en français
        {voiceSupported ? "" : " (texte seul sur ce navigateur)"}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {voiceSupported && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTestVoice}
            className="text-xs px-2.5 py-1 rounded-lg border border-africhess-gold/40 text-africhess-gold hover:bg-africhess-gold/10"
          >
            🔊 {t("comments.voice.test")}
          </button>
          {latest && (
            <button
              type="button"
              onClick={handleListenLatest}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/20 opacity-80 hover:opacity-100"
            >
              {t("comments.voice.listen")}
            </button>
          )}
        </div>
      )}
      {voiceSupported && (
        <p className="text-[10px] opacity-50">{t("comments.voice.hint")}</p>
      )}
      {!voiceSupported && (
        <p className="text-[10px] text-africhess-terracotta opacity-80">
          Voix non supportée par ce navigateur — texte uniquement.
        </p>
      )}

      <AnimatePresence mode="wait">
        {(latestAi ?? latest) && (
          <motion.div
            key={`${(latestAi ?? latest)!.moveNumber}-${(latestAi ?? latest)!.san}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg p-3 border ${
              (latestAi ?? latest)!.byAi
                ? "border-africhess-gold/40 bg-africhess-gold/10"
                : "border-africhess-green/30 bg-africhess-green/10"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
              {(latestAi ?? latest)!.byAi ? "🤖 IA" : "💡 Coach"} · {(latestAi ?? latest)!.san}
            </p>
            <p className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}>
              {(latestAi ?? latest)!.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {latest && latestAi && !latest.byAi && (
        <p className={`${compact ? "text-[10px]" : "text-xs"} opacity-60 italic`}>
          💡 Coach · {latest.san} — {latest.text}
        </p>
      )}

      {comments.length > 1 && (
        <div
          className={`max-h-36 overflow-y-auto space-y-2 pr-1 ${
            compact ? "text-[10px]" : "text-xs"
          } opacity-70`}
        >
          {[...comments].reverse().slice(1, 6).map((c) => (
            <p key={`${c.moveNumber}-${c.san}`}>
              <span className="font-mono text-africhess-gold">{c.san}</span>
              {" — "}
              <span className={c.byAi ? "" : "italic"}>{c.text}</span>
            </p>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs opacity-50">
          L&apos;IA et le coach commenteront chaque coup à l&apos;oral et à l&apos;écrit…
        </p>
      )}
    </div>
  );
}
