"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Share2, Sparkles, TrendingUp, Trophy, Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { playPuzzleStreakFanfare, playPuzzleSuccess } from "@/lib/puzzleSounds";
import { sharePuzzleResult } from "@/lib/puzzleShare";
import { usePuzzlePreferencesStore } from "@/store/puzzlePreferences";
import { useAuthStore } from "@/store/auth";

export type CelebrationVariant =
  | "default"
  | "first"
  | "streak3"
  | "streak5"
  | "streak10"
  | "perfect_set";

export interface PuzzleCelebrationData {
  id: number;
  current: number;
  total?: number | null;
  streak?: number;
  sessionStreak?: number;
  eloChange?: number;
  xpGained?: number;
  weeklyRank?: number | null;
  mode: "daily" | "training" | "rush" | "survival" | "battle" | "quiz" | "generic";
  titleOverride?: string;
  variant?: CelebrationVariant;
  showShare?: boolean;
  manualContinue?: boolean;
}

interface PuzzleSolveCelebrationProps {
  data: PuzzleCelebrationData | null;
  onDone?: () => void;
  autoDismissMs?: number;
}

const FLOWERS = [
  { left: "8%", bottom: "18%", color: "#e07a5f", delay: "0s" },
  { left: "22%", bottom: "12%", color: "#d4a843", delay: "0.4s" },
  { left: "78%", bottom: "15%", color: "#6ee7a8", delay: "0.2s" },
  { left: "88%", bottom: "22%", color: "#f4a4c0", delay: "0.6s" },
  { left: "52%", bottom: "8%", color: "#67e8f9", delay: "0.3s" },
];

const BUTTERFLIES = [
  { left: "15%", top: "28%", delay: "0s" },
  { left: "70%", top: "22%", delay: "1.2s" },
];

const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 17 + 7) % 100}%`,
  delay: `${(i % 8) * 0.12}s`,
  color: ["#d4a843", "#6ee7a8", "#67e8f9", "#f4a4c0", "#ffd54a"][i % 5],
}));

function resolveVariant(data: PuzzleCelebrationData): CelebrationVariant {
  if (data.variant) return data.variant;
  if (data.total && data.total >= 10 && data.current >= data.total) return "perfect_set";
  const s = data.sessionStreak ?? 0;
  if (s >= 10) return "streak10";
  if (s >= 5) return "streak5";
  if (s >= 3) return "streak3";
  if (data.current === 1 && data.mode === "training" && data.total === 1) return "first";
  if (data.current === 1 && data.mode === "daily") return "first";
  return "default";
}

export function PuzzleSolveCelebration({
  data,
  onDone,
  autoDismissMs = 3200,
}: PuzzleSolveCelebrationProps) {
  const { t } = useTranslation();
  const { lowBandwidth } = useAuthStore();
  const gardenTheme = usePuzzlePreferencesStore((s) => s.gardenTheme);
  const [visible, setVisible] = useState(false);
  const [pawnStep, setPawnStep] = useState(0);
  const [sharing, setSharing] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const fromStep = data ? Math.max(0, data.current - 1) : 0;
  const toStep = data?.current ?? 1;
  const variant = data ? resolveVariant(data) : "default";
  const manualContinue = data?.manualContinue ?? false;
  const isEpic = variant === "perfect_set" || variant === "streak10";

  const visibleSteps = useMemo(() => {
    if (!data) return 5;
    const horizon = data.total && data.total > 1 ? data.total : Math.max(toStep + 3, 5);
    return Math.min(Math.max(horizon, 5), 9);
  }, [data, toStep]);

  const steps = useMemo(
    () => Array.from({ length: visibleSteps }, (_, i) => i + 1),
    [visibleSteps]
  );

  const titleKey = useMemo(() => {
    if (data?.titleOverride) return null;
    switch (variant) {
      case "first":
        return "puzzles.celebrate.first";
      case "streak3":
        return "puzzles.celebrate.streak3";
      case "streak5":
        return "puzzles.celebrate.streak5";
      case "streak10":
        return "puzzles.celebrate.streak10";
      case "perfect_set":
        return "puzzles.celebrate.perfect";
      default:
        if (data?.mode === "daily") return "puzzles.celebrate.daily";
        if (data?.mode === "rush") return "puzzles.celebrate.rush";
        if (data?.mode === "survival") return "puzzles.celebrate.survival";
        if (data?.mode === "quiz") return "puzzles.celebrate.quiz";
        return "puzzles.celebrate.title";
    }
  }, [data, variant]);

  useEffect(() => {
    if (!data) {
      setVisible(false);
      setPawnStep(0);
      return;
    }
    setVisible(true);
    setPawnStep(fromStep);

    const soundsOn = !lowBandwidth;
    if (variant === "streak10" || variant === "perfect_set" || variant === "streak5") {
      playPuzzleStreakFanfare(soundsOn);
    } else {
      playPuzzleSuccess(soundsOn);
    }

    const climbTimer = window.setTimeout(() => setPawnStep(toStep), 350);

    let dismissTimer: number | undefined;
    if (!manualContinue) {
      dismissTimer = window.setTimeout(() => {
        setVisible(false);
        onDoneRef.current?.();
      }, autoDismissMs);
    }

    return () => {
      window.clearTimeout(climbTimer);
      if (dismissTimer) window.clearTimeout(dismissTimer);
    };
  }, [data, autoDismissMs, lowBandwidth, fromStep, toStep, manualContinue, variant]);

  const handleContinue = () => {
    setVisible(false);
    onDoneRef.current?.();
  };

  const handleShare = async () => {
    if (!data || sharing) return;
    setSharing(true);
    const progress =
      data.total && data.total > 1 ? `${data.current}/${data.total}` : String(data.current);
    const title = titleKey ? t(titleKey) : data.titleOverride ?? t("puzzles.celebrate.title");
    await sharePuzzleResult({
      title,
      progress,
      streak: data.streak,
      text: t("puzzles.share.text", { progress, streak: data.streak ?? 0 }),
    });
    setSharing(false);
  };

  if (!data || !visible) return null;

  const progressPct =
    data.total && data.total > 0 ? Math.min(100, (data.current / data.total) * 100) : 100;

  const title = data.titleOverride ?? (titleKey ? t(titleKey) : t("puzzles.celebrate.title"));

  return (
    <div
      className={`puzzle-garden-overlay puzzle-garden-theme-${gardenTheme} ${
        isEpic ? "puzzle-garden-epic" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="puzzle-garden-sky" aria-hidden />
      <div className="puzzle-garden-sun" aria-hidden />
      <div className="puzzle-garden-hill puzzle-garden-hill-back" aria-hidden />
      <div className="puzzle-garden-hill puzzle-garden-hill-front" aria-hidden />
      <div className="puzzle-garden-grass" aria-hidden />

      {isEpic && !lowBandwidth && (
        <div className="puzzle-garden-fireworks" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="puzzle-garden-firework" style={{ "--fw-i": i } as React.CSSProperties} />
          ))}
        </div>
      )}

      {!lowBandwidth &&
        CONFETTI.map((c, i) => (
          <span
            key={i}
            className="puzzle-garden-confetti"
            style={{ left: c.left, animationDelay: c.delay, background: c.color }}
            aria-hidden
          />
        ))}

      {!lowBandwidth &&
        FLOWERS.map((f, i) => (
          <span
            key={i}
            className="puzzle-garden-flower"
            style={{ left: f.left, bottom: f.bottom, animationDelay: f.delay, color: f.color }}
            aria-hidden
          />
        ))}

      {!lowBandwidth &&
        BUTTERFLIES.map((b, i) => (
          <span
            key={i}
            className="puzzle-garden-butterfly"
            style={{ left: b.left, top: b.top, animationDelay: b.delay }}
            aria-hidden
          >
            ✦
          </span>
        ))}

      <div className="puzzle-garden-content">
        <p className={`puzzle-garden-title ${isEpic ? "puzzle-garden-title-epic" : ""}`}>
          {isEpic && <Sparkles size={18} className="inline mr-1 text-africhess-gold" aria-hidden />}
          {title}
        </p>

        <div className="puzzle-garden-stairs-scene">
          <div className="puzzle-garden-stairs">
            {steps.map((stepNum) => {
              const done = stepNum < toStep;
              const active = stepNum === toStep;
              const upcoming = stepNum > toStep;
              return (
                <div
                  key={stepNum}
                  className={`puzzle-garden-step ${done ? "puzzle-garden-step-done" : ""} ${
                    active ? "puzzle-garden-step-active" : ""
                  } ${upcoming ? "puzzle-garden-step-upcoming" : ""}`}
                  style={
                    {
                      "--step-index": stepNum,
                      "--step-steps-total": visibleSteps,
                    } as React.CSSProperties
                  }
                >
                  <span className="puzzle-garden-step-num">{stepNum}</span>
                  {done && <span className="puzzle-garden-step-check" aria-hidden>✓</span>}
                </div>
              );
            })}

            <div
              className="puzzle-garden-pawn"
              style={
                {
                  "--pawn-step": pawnStep,
                  "--pawn-steps-total": visibleSteps,
                } as React.CSSProperties
              }
              aria-hidden
            >
              <span className="puzzle-garden-pawn-piece">♙</span>
              <span className="puzzle-garden-pawn-shadow" />
            </div>
          </div>
        </div>

        <div className="puzzle-garden-hud">
          {data.total != null && data.total > 1 ? (
            <p className="puzzle-garden-progress">
              <span className="puzzle-garden-progress-current">{data.current}</span>
              <span className="puzzle-garden-progress-sep">/</span>
              <span className="puzzle-garden-progress-total">{data.total}</span>
            </p>
          ) : (
            <p className="puzzle-garden-progress puzzle-garden-progress-solo">{data.current}</p>
          )}
          <p className="puzzle-garden-progress-label">{t("puzzles.celebrate.progress")}</p>
          <div className="puzzle-garden-progress-track">
            <div className="puzzle-garden-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="puzzle-garden-meta">
            {data.xpGained != null && data.xpGained > 0 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-xp">
                <Zap size={14} aria-hidden />
                +{data.xpGained} XP
              </span>
            )}
            {data.streak != null && data.streak > 0 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-streak">
                <Flame size={14} aria-hidden />
                {t("puzzles.celebrate.streak", { n: data.streak })}
              </span>
            )}
            {data.sessionStreak != null && data.sessionStreak >= 3 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-session">
                <Trophy size={14} aria-hidden />
                {t("puzzles.celebrate.sessionStreak", { n: data.sessionStreak })}
              </span>
            )}
            {data.eloChange != null && data.eloChange !== 0 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-elo">
                <TrendingUp size={14} aria-hidden />
                {data.eloChange > 0 ? "+" : ""}
                {data.eloChange} ELO
              </span>
            )}
            {data.weeklyRank != null && data.weeklyRank > 0 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-rank">
                <Trophy size={14} aria-hidden />
                #{data.weeklyRank}
              </span>
            )}
          </div>

          <div className="puzzle-garden-actions">
            {data.showShare && (
              <button
                type="button"
                onClick={() => void handleShare()}
                disabled={sharing}
                className="puzzle-garden-btn puzzle-garden-btn-share"
              >
                <Share2 size={16} aria-hidden />
                {sharing ? t("puzzles.share.sending") : t("puzzles.share.button")}
              </button>
            )}
            {manualContinue ? (
              <button
                type="button"
                onClick={handleContinue}
                className="puzzle-garden-btn puzzle-garden-btn-continue"
                autoFocus
              >
                {t("puzzles.celebrate.continue")}
              </button>
            ) : (
              <p className="puzzle-garden-hint">{t("puzzles.celebrate.hint")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
