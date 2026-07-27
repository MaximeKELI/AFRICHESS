"use client";

import { useEffect } from "react";
import type { MoveComment } from "@/lib/chessDisplay";
import {
  initAiSpeech,
  isAiSpeechSupported,
  speakComment,
  stopAiSpeech,
  unlockAiSpeech,
  testAiSpeech,
  liveSpokenCommentKeys,
  liveSpeechPrimed,
  setLiveSpeechPrimed,
  resetLiveSpeechTracking,
} from "@/lib/aiSpeech";
import { selectLiveCommentsToSpeak } from "@/lib/liveCommentarySpeech";
import { useTranslation } from "@/hooks/useTranslation";

interface AiCommentaryPanelProps {
  comments: MoveComment[];
  enabled: boolean;
  compact?: boolean;
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

  const handleTestVoice = () => {
    unlockAiSpeech();
    void testAiSpeech(t("comments.voice.testPhrase"));
  };

  const handleListenLatest = () => {
    unlockAiSpeech();
    if (latest) {
      liveSpokenCommentKeys.add(commentKey(latest));
      void speakComment(latest.text, { byAi: latest.byAi, enabled: true, forceUnlock: true });
    }
  };

  useEffect(() => {
    initAiSpeech();
    unlockAiSpeech();
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAiSpeech();
      resetLiveSpeechTracking();
    }
  }, [enabled]);

  useEffect(() => {
    if (comments.length === 0) {
      resetLiveSpeechTracking();
    }
  }, [comments.length]);

  useEffect(() => {
    if (!enabled || !autoSpeak || comments.length === 0) return;

    const fresh = comments.filter(
      (c) => c.text.trim() && !liveSpokenCommentKeys.has(commentKey(c))
    );
    if (!fresh.length) return;

    const decision = selectLiveCommentsToSpeak(fresh, comments.length, liveSpeechPrimed);
    setLiveSpeechPrimed(decision.primed);

    // Marquer seulement le backlog volontairement ignoré — pas les phrases à lire
    if (decision.skipSpeech) {
      for (const c of fresh) liveSpokenCommentKeys.add(commentKey(c));
      return;
    }

    const dropped = fresh.slice(0, Math.max(0, fresh.length - decision.toSpeak.length));
    for (const c of dropped) liveSpokenCommentKeys.add(commentKey(c));

    const toSpeak = decision.toSpeak;
    if (!toSpeak.length) return;
    void (async () => {
      unlockAiSpeech();
      for (let index = 0; index < toSpeak.length; index += 1) {
        const comment = toSpeak[index];
        await speakComment(comment.text, {
          byAi: comment.byAi,
          enabled: true,
          forceUnlock: true,
          interrupt: index === 0,
        });
        liveSpokenCommentKeys.add(commentKey(comment));
      }
    })();
  }, [comments, enabled, autoSpeak]);

  if (!enabled) {
    return (
      <div className={compact ? "text-xs opacity-50" : "text-sm opacity-60"}>
        Activez la voix IA pour les commentaires pendant la partie.
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
          Voix non supportée par ce navigateur.
        </p>
      )}
      <p className="text-[11px] opacity-55">
        {latest ? `Dernier coup vocal: ${latest.san}` : "En attente du prochain coup…"}
      </p>
    </div>
  );
}
