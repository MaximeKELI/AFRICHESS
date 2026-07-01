"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { playPuzzleSuccess } from "@/lib/puzzleSounds";
import { useAuthStore } from "@/store/auth";

export interface PuzzleCelebrationData {
  id: number;
  current: number;
  total?: number | null;
  streak?: number;
  eloChange?: number;
  mode: "daily" | "training" | "rush" | "survival" | "battle" | "quiz" | "generic";
  titleOverride?: string;
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

export function PuzzleSolveCelebration({
  data,
  onDone,
  autoDismissMs = 3000,
}: PuzzleSolveCelebrationProps) {
  const { t } = useTranslation();
  const { lowBandwidth } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [pawnStep, setPawnStep] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const fromStep = data ? Math.max(0, data.current - 1) : 0;
  const toStep = data?.current ?? 1;

  const visibleSteps = useMemo(() => {
    if (!data) return 5;
    const horizon = data.total && data.total > 1 ? data.total : Math.max(toStep + 3, 5);
    return Math.min(Math.max(horizon, 5), 9);
  }, [data, toStep]);

  const steps = useMemo(
    () => Array.from({ length: visibleSteps }, (_, i) => i + 1),
    [visibleSteps]
  );

  useEffect(() => {
    if (!data) {
      setVisible(false);
      setPawnStep(0);
      return;
    }
    setVisible(true);
    setPawnStep(fromStep);
    playPuzzleSuccess(!lowBandwidth);

    const climbTimer = window.setTimeout(() => {
      setPawnStep(toStep);
    }, 350);

    const timer = window.setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, autoDismissMs);

    return () => {
      window.clearTimeout(climbTimer);
      window.clearTimeout(timer);
    };
  }, [data, autoDismissMs, lowBandwidth, fromStep, toStep]);

  if (!data || !visible) return null;

  const progressPct =
    data.total && data.total > 0 ? Math.min(100, (data.current / data.total) * 100) : 100;

  const title =
    data.titleOverride ??
    (data.mode === "daily"
      ? t("puzzles.celebrate.daily")
      : data.mode === "rush"
        ? t("puzzles.celebrate.rush")
        : data.mode === "survival"
          ? t("puzzles.celebrate.survival")
          : data.mode === "quiz"
            ? t("puzzles.celebrate.quiz")
            : t("puzzles.celebrate.title"));

  return (
    <div
      className="puzzle-garden-overlay"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="puzzle-garden-sky" aria-hidden />
      <div className="puzzle-garden-sun" aria-hidden />
      <div className="puzzle-garden-hill puzzle-garden-hill-back" aria-hidden />
      <div className="puzzle-garden-hill puzzle-garden-hill-front" aria-hidden />
      <div className="puzzle-garden-grass" aria-hidden />

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
        <p className="puzzle-garden-title">{title}</p>

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
            {data.streak != null && data.streak > 0 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-streak">
                <Flame size={14} aria-hidden />
                {t("puzzles.celebrate.streak", { n: data.streak })}
              </span>
            )}
            {data.eloChange != null && data.eloChange !== 0 && (
              <span className="puzzle-garden-chip puzzle-garden-chip-elo">
                <TrendingUp size={14} aria-hidden />
                {data.eloChange > 0 ? "+" : ""}
                {data.eloChange} ELO
              </span>
            )}
          </div>

          <p className="puzzle-garden-hint">{t("puzzles.celebrate.hint")}</p>
        </div>
      </div>
    </div>
  );
}
