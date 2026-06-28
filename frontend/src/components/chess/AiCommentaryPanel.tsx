"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MoveComment } from "@/lib/chessDisplay";
import { initAiSpeech, isAiSpeechSupported, speakComment, stopAiSpeech, unlockAiSpeech } from "@/lib/aiSpeech";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

interface AiCommentaryPanelProps {
  comments: MoveComment[];
  enabled: boolean;
  compact?: boolean;
}

export function AiCommentaryPanel({
  comments,
  enabled,
  compact = false,
}: AiCommentaryPanelProps) {
  const { t } = useTranslation();
  const { lowBandwidth } = useAuthStore();
  const latest = comments.at(-1);
  const lastSpokenKey = useRef<string | null>(null);
  const voiceSupported = isAiSpeechSupported();

  useEffect(() => {
    initAiSpeech();
    return () => stopAiSpeech();
  }, []);

  useEffect(() => {
    if (!enabled || !latest || lowBandwidth) return;
    if (!isAiSpeechSupported()) return;

    const key = `${latest.moveNumber}-${latest.san}-${latest.text}`;
    if (lastSpokenKey.current === key) return;
    lastSpokenKey.current = key;

    const delay = latest.byAi ? 450 : 250;
    const timer = window.setTimeout(() => {
      speakComment(latest.text, { byAi: latest.byAi, enabled: true });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [enabled, latest, lowBandwidth]);

  useEffect(() => {
    if (!enabled) {
      stopAiSpeech();
      lastSpokenKey.current = null;
    }
  }, [enabled]);

  if (!enabled) {
    return (
      <div className={compact ? "text-xs opacity-50" : "text-sm opacity-60"}>
        Activez les commentaires : l&apos;IA et le coach parlent en français
        {voiceSupported ? "" : " (texte seul sur ce navigateur)"}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {voiceSupported && (
        <button
          type="button"
          onClick={() => {
            unlockAiSpeech();
            if (latest) {
              speakComment(latest.text, { byAi: latest.byAi, enabled: true, forceUnlock: true });
            }
          }}
          className="text-[10px] opacity-60 hover:opacity-100 flex items-center gap-1 transition-opacity"
        >
          <span aria-hidden>🔊</span> {t("comments.voice.listen")}
        </button>
      )}
      {!voiceSupported && (
        <p className="text-[10px] text-africhess-terracotta opacity-80">
          Voix non supportée par ce navigateur — texte uniquement.
        </p>
      )}

      <AnimatePresence mode="wait">
        {latest && (
          <motion.div
            key={`${latest.moveNumber}-${latest.san}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg p-3 border ${
              latest.byAi
                ? "border-africhess-gold/40 bg-africhess-gold/10"
                : "border-africhess-green/30 bg-africhess-green/10"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
              {latest.byAi ? "🤖 IA" : "💡 Coach"} · {latest.san}
            </p>
            <p className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}>
              {latest.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
