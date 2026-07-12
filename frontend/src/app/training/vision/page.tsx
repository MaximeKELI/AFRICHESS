"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chessboard } from "react-chessboard";
import { useTranslation } from "@/hooks/useTranslation";
import { randomCoordinate, squareColor, COORDINATE_TIMED_SECONDS } from "@/lib/visionTraining";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

type Drill = "coordinate" | "color" | "timed";

const TIMED_SECONDS = COORDINATE_TIMED_SECONDS;

/** Entraînement vision : coordonnées, couleur, chrono 30 s (parité Lichess). */
export default function VisionTrainingPage() {
  const { t } = useTranslation();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [drill, setDrill] = useState<Drill>("coordinate");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [target, setTarget] = useState(() => randomCoordinate());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Record<string, React.CSSProperties>>({});
  const [timedLeft, setTimedLeft] = useState<number | null>(null);
  const [timedActive, setTimedActive] = useState(false);
  const [timedFinal, setTimedFinal] = useState<number | null>(null);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const nextQuestion = useCallback(() => {
    setTarget(randomCoordinate());
    setHighlight({});
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!timedActive || timedLeft === null) return;
    if (timedLeft <= 0) {
      setTimedActive(false);
      setTimedFinal(scoreRef.current);
      setFeedback(t("vision.timedOver", { score: scoreRef.current }));
      return;
    }
    const id = window.setTimeout(() => setTimedLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [timedActive, timedLeft, t]);

  const startTimed = () => {
    setDrill("timed");
    setScore(0);
    setStreak(0);
    setTimedFinal(null);
    setTimedLeft(TIMED_SECONDS);
    setTimedActive(true);
    setFeedback(null);
    nextQuestion();
  };

  const onSquareClick = (square: string) => {
    if (drill === "timed" && !timedActive) return;

    if (drill === "coordinate" || drill === "timed") {
      const ok = square === target;
      setFeedback(ok ? t("vision.correct") : t("vision.wrong", { answer: target }));
      if (ok) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        window.setTimeout(nextQuestion, drill === "timed" ? 200 : 600);
      } else {
        setStreak(0);
        if (drill !== "timed") {
          setHighlight({ [target]: { backgroundColor: "rgba(34, 197, 94, 0.5)" } });
        } else {
          window.setTimeout(nextQuestion, 200);
        }
      }
      return;
    }

    const expected = squareColor(target);
    const picked = squareColor(square);
    const ok = expected === picked;
    setFeedback(
      ok
        ? t("vision.correct")
        : t("vision.colorWrong", {
            square: target,
            color: expected === "light" ? t("vision.light") : t("vision.dark"),
          })
    );
    if (ok) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      window.setTimeout(nextQuestion, 700);
    } else {
      setStreak(0);
    }
  };

  const colorPrompt =
    squareColor(target) === "light" ? t("vision.light") : t("vision.dark");

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.learn")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("vision.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("vision.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setDrill("coordinate");
            setTimedActive(false);
            setTimedLeft(null);
            nextQuestion();
          }}
          className={`px-3 py-1.5 rounded-lg text-sm ${drill === "coordinate" ? "african-gradient text-white" : "border border-white/20"}`}
        >
          {t("vision.drill.coordinate")}
        </button>
        <button
          type="button"
          onClick={() => {
            setDrill("color");
            setTimedActive(false);
            setTimedLeft(null);
            nextQuestion();
          }}
          className={`px-3 py-1.5 rounded-lg text-sm ${drill === "color" ? "african-gradient text-white" : "border border-white/20"}`}
        >
          {t("vision.drill.color")}
        </button>
        <button
          type="button"
          onClick={startTimed}
          className={`px-3 py-1.5 rounded-lg text-sm ${drill === "timed" ? "african-gradient text-white" : "border border-white/20"}`}
        >
          {t("vision.timed")}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center text-sm">
        <label className="flex items-center gap-2 opacity-80">
          {t("vision.orientation")}
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as "white" | "black")}
            className="px-2 py-1 rounded border border-white/20 bg-transparent"
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>
        <span>{t("vision.score", { score })}</span>
        <span>{t("vision.streak", { streak })}</span>
        {timedActive && timedLeft != null && (
          <span className="text-africhess-gold font-mono">{timedLeft}s</span>
        )}
      </div>

      {drill === "timed" && !timedActive && timedFinal == null && (
        <button
          type="button"
          onClick={startTimed}
          className="w-full py-2 african-gradient text-white rounded-lg text-sm"
        >
          {t("vision.timedStart")}
        </button>
      )}

      <p className="text-center text-lg font-semibold text-africhess-gold">
        {drill === "color"
          ? t("vision.promptColor", { square: target.toUpperCase(), color: colorPrompt })
          : t("vision.promptCoordinate", { square: target.toUpperCase() })}
      </p>

      <div className="aspect-square max-w-md mx-auto rounded-xl overflow-hidden border border-white/20">
        <Chessboard
          boardOrientation={orientation}
          boardWidth={360}
          arePiecesDraggable={false}
          onSquareClick={onSquareClick}
          customSquareStyles={highlight}
          customDarkSquareStyle={squareBase.dark as Record<string, string>}
          customLightSquareStyle={squareBase.light as Record<string, string>}
        />
      </div>

      {feedback && (
        <p className="text-center text-sm" role="status">
          {feedback}
        </p>
      )}

      {drill !== "timed" && (
        <button
          type="button"
          onClick={nextQuestion}
          className="w-full py-2 border rounded-lg text-sm hover:bg-white/5"
        >
          {t("vision.skip")}
        </button>
      )}
    </div>
  );
}
