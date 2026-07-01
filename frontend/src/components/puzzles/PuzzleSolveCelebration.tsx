"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flame, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { playPuzzleSuccess } from "@/lib/puzzleSounds";
import { useAuthStore } from "@/store/auth";

export interface PuzzleCelebrationData {
  id: number;
  current: number;
  total?: number | null;
  streak?: number;
  eloChange?: number;
  mode: "daily" | "training" | "rush" | "survival" | "battle" | "generic";
}

interface PuzzleSolveCelebrationProps {
  data: PuzzleCelebrationData | null;
  onDone?: () => void;
  autoDismissMs?: number;
}

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${8 + ((i * 17) % 84)}%`,
  delay: `${i * 45}ms`,
  hue: i % 3 === 0 ? "var(--africhess-gold)" : i % 3 === 1 ? "var(--africhess-green)" : "#67e8f9",
}));

export function PuzzleSolveCelebration({
  data,
  onDone,
  autoDismissMs = 1800,
}: PuzzleSolveCelebrationProps) {
  const { t } = useTranslation();
  const { lowBandwidth } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [displayNum, setDisplayNum] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!data) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setDisplayNum(0);
    playPuzzleSuccess(!lowBandwidth);

    const target = data.current;
    let frame = 0;
    const countUp = window.setInterval(() => {
      frame += 1;
      setDisplayNum(Math.min(target, Math.ceil((frame / 12) * target)));
      if (frame >= 12) window.clearInterval(countUp);
    }, 35);

    const timer = window.setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, autoDismissMs);

    return () => {
      window.clearInterval(countUp);
      window.clearTimeout(timer);
    };
  }, [data, autoDismissMs, lowBandwidth]);

  if (!data || !visible) return null;

  const progressPct =
    data.total && data.total > 0 ? Math.min(100, (data.current / data.total) * 100) : 100;

  const title =
    data.mode === "daily"
      ? t("puzzles.celebrate.daily")
      : data.mode === "rush"
        ? t("puzzles.celebrate.rush")
        : data.mode === "survival"
          ? t("puzzles.celebrate.survival")
          : t("puzzles.celebrate.title");

  return (
    <div
      className="puzzle-fx-celebration"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="puzzle-fx-celebration-backdrop" />
      <div className="puzzle-fx-celebration-ring" aria-hidden />
      <div className="puzzle-fx-celebration-card">
        {!lowBandwidth &&
          CONFETTI.map((c) => (
            <span
              key={c.id}
              className="puzzle-fx-confetti"
              style={{ left: c.left, animationDelay: c.delay, background: c.hue }}
            />
          ))}

        <div className="puzzle-fx-check-wrap">
          <div className="puzzle-fx-check-circle">
            <Check className="puzzle-fx-check-icon" strokeWidth={3} aria-hidden />
          </div>
        </div>

        <p className="puzzle-fx-celebrate-title">{title}</p>

        {data.total != null && data.total > 1 ? (
          <div className="puzzle-fx-progress-block">
            <p className="puzzle-fx-progress-count">
              <span className="puzzle-fx-progress-current">{displayNum}</span>
              <span className="puzzle-fx-progress-sep">/</span>
              <span className="puzzle-fx-progress-total">{data.total}</span>
            </p>
            <p className="puzzle-fx-progress-label">{t("puzzles.celebrate.progress")}</p>
            <div className="puzzle-fx-progress-track">
              <div
                className="puzzle-fx-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="puzzle-fx-solo-count puzzle-fx-pop-in">{displayNum || 1}</p>
        )}

        <div className="puzzle-fx-meta-row">
          {data.streak != null && data.streak > 0 && (
            <span className="puzzle-fx-meta-chip puzzle-fx-meta-streak">
              <Flame size={14} aria-hidden />
              {t("puzzles.celebrate.streak", { n: data.streak })}
            </span>
          )}
          {data.eloChange != null && data.eloChange !== 0 && (
            <span className="puzzle-fx-meta-chip puzzle-fx-meta-elo">
              <TrendingUp size={14} aria-hidden />
              {data.eloChange > 0 ? "+" : ""}
              {data.eloChange} ELO
            </span>
          )}
        </div>

        <p className="puzzle-fx-celebrate-hint">{t("puzzles.celebrate.hint")}</p>
      </div>
    </div>
  );
}
