"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MoveComment } from "@/lib/chessDisplay";
import {
  initAiSpeech,
  isAiSpeechSupported,
  speakComment,
  stopAiSpeech,
  unlockAiSpeech,
  testAiSpeech,
} from "@/lib/aiSpeech";
import { selectLiveCommentsToSpeak } from "@/lib/liveCommentarySpeech";
import { useTranslation } from "@/hooks/useTranslation";

interface AiCommentaryPanelProps {
  comments: MoveComment[];
  enabled: boolean;
  compact?: boolean;
  /** Lit automatiquement chaque nouveau commentaire (partie vs IA). */
  autoSpeak?: boolean;
}

function commentKey(c: MoveComment): string {
  return `${c.moveNumber}|${c.san}|${c.text}`;
}

export function AiCommentaryPanel({
  comments,
  enabled,
  compact = false,
  autoSpeak = false,
}: AiCommentaryPanelProps) {
  const { t } = useTranslation();
  const latest = comments.at(-1);
  const voiceSupported = isAiSpeechSupported();
  const spokenKeysRef = useRef<Set<string>>(new Set());
  const speakQueueRef = useRef(0);
  const primedRef = useRef(false);

  const handleTestVoice = () => {
    unlockAiSpeech();
    void testAiSpeech(t("comments.voice.testPhrase"));
  };

  const handleListenLatest = () => {
    unlockAiSpeech();
    if (latest) {
      spokenKeysRef.current.add(commentKey(latest));
      void speakComment(latest.text, { byAi: latest.byAi, enabled: true, forceUnlock: true });
    }
  };

  useEffect(() => {
    initAiSpeech();
    unlockAiSpeech();
    // Ne pas stopAiSpeech au démontage : Strict Mode / remount coupait toute la voix
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAiSpeech();
      spokenKeysRef.current.clear();
      speakQueueRef.current = 0;
      primedRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !autoSpeak || comments.length === 0) return;

    const fresh = comments.filter((c) => c.text.trim() && !spokenKeysRef.current.has(commentKey(c)));
    if (!fresh.length) return;

    const decision = selectLiveCommentsToSpeak(fresh, comments.length, primedRef.current);
    primedRef.current = decision.primed;

    for (const c of fresh) {
      spokenKeysRef.current.add(commentKey(c));
    }

    if (decision.skipSpeech || !decision.toSpeak.length) return;

    const toSpeak = decision.toSpeak;
    const queueId = ++speakQueueRef.current;
    void (async () => {
      unlockAiSpeech();
      for (let index = 0; index < toSpeak.length; index += 1) {
        if (speakQueueRef.current !== queueId) return;
        const comment = toSpeak[index];
        // Enfiler sans couper entre coach + IA (interrupt seulement le 1er)
        await speakComment(comment.text, {
          byAi: comment.byAi,
          enabled: true,
          forceUnlock: true,
          interrupt: index === 0,
        });
      }
    })();
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
        {latest && (
          <motion.div
            key={`${latest.moveNumber}-${latest.san}-${comments.length}`}
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
          className={`max-h-48 overflow-y-auto space-y-2 pr-1 ${
            compact ? "text-[10px]" : "text-xs"
          } opacity-70`}
        >
          {[...comments].reverse().slice(1, 12).map((c) => (
            <p key={`${c.moveNumber}-${c.san}-${c.text.slice(0, 24)}`}>
              <span className="font-mono text-africhess-gold">{c.san}</span>
              {" — "}
              <span className={c.byAi ? "" : "italic"}>{c.text}</span>
            </p>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs opacity-50">
          L&apos;IA commentera chaque coup à l&apos;oral et à l&apos;écrit…
        </p>
      )}
    </div>
  );
}
