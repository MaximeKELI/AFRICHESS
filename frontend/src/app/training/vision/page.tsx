"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Chessboard } from "react-chessboard";
import { useTranslation } from "@/hooks/useTranslation";
import { randomCoordinate, squareColor } from "@/lib/visionTraining";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

type Drill = "coordinate" | "color";

/** Entraînement vision : coordonnées et couleur des cases */
export default function VisionTrainingPage() {
  const { t, locale } = useTranslation();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [drill, setDrill] = useState<Drill>("coordinate");
  const [target, setTarget] = useState(() => randomCoordinate());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Record<string, React.CSSProperties>>({});

  const nextQuestion = useCallback(() => {
    setTarget(randomCoordinate());
    setHighlight({});
    setFeedback(null);
  }, []);

  const onSquareClick = (square: string) => {
    if (drill === "coordinate") {
      const ok = square === target;
      setFeedback(ok ? t("vision.correct") : t("vision.wrong", { answer: target }));
      if (ok) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        setTimeout(nextQuestion, 600);
      } else {
        setStreak(0);
        setHighlight({ [target]: { backgroundColor: "rgba(34, 197, 94, 0.5)" } });
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
      setTimeout(nextQuestion, 700);
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setDrill("coordinate"); nextQuestion(); }}
          className={`px-3 py-1.5 rounded-lg text-sm ${drill === "coordinate" ? "african-gradient text-white" : "border border-white/20"}`}
        >
          {t("vision.drill.coordinate")}
        </button>
        <button
          type="button"
          onClick={() => { setDrill("color"); nextQuestion(); }}
          className={`px-3 py-1.5 rounded-lg text-sm ${drill === "color" ? "african-gradient text-white" : "border border-white/20"}`}
        >
          {t("vision.drill.color")}
        </button>
      </div>

      <div className="flex justify-between text-sm">
        <span>{t("vision.score", { score })}</span>
        <span>{t("vision.streak", { streak })}</span>
      </div>

      <p className="text-center text-lg font-semibold text-africhess-gold">
        {drill === "coordinate"
          ? t("vision.promptCoordinate", { square: target.toUpperCase() })
          : t("vision.promptColor", { square: target.toUpperCase(), color: colorPrompt })}
      </p>

      <div className="aspect-square max-w-md mx-auto rounded-xl overflow-hidden border border-white/20">
        <Chessboard
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

      <button
        type="button"
        onClick={nextQuestion}
        className="w-full py-2 border rounded-lg text-sm hover:bg-white/5"
      >
        {t("vision.skip")}
      </button>
    </div>
  );
}
