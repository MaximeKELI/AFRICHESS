"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useTranslation } from "@/hooks/useTranslation";
import { SOLO_LEVELS, soloMoveAllowed, soloVictory } from "@/lib/soloChess";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

/** Solo Chess : capturer toutes les pièces adverses */
export default function SoloChessPage() {
  const { t, locale } = useTranslation();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [levelIdx, setLevelIdx] = useState(0);
  const level = SOLO_LEVELS[levelIdx];
  const [game, setGame] = useState(() => new Chess(level.fen));
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reset = useCallback((idx: number) => {
    const lv = SOLO_LEVELS[idx];
    setGame(new Chess(lv.fen));
    setWon(false);
    setMessage(null);
  }, []);

  const onDrop = (from: string, to: string) => {
    if (won) return false;
    const g = new Chess(game.fen());
    if (!soloMoveAllowed(g, from as Square, to as Square)) {
      setMessage(t("solo.mustCapture"));
      return false;
    }
    try {
      g.move({ from, to, promotion: "q" });
    } catch {
      return false;
    }
    setGame(g);
    if (soloVictory(g)) {
      setWon(true);
      setMessage(t("solo.win"));
    } else {
      setMessage(null);
    }
    return true;
  };

  const label = locale === "fr" ? level.labelFr : level.labelEn;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.learn")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("solo.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("solo.subtitle")}</p>
      </div>

      <select
        value={levelIdx}
        onChange={(e) => {
          const idx = Number(e.target.value);
          setLevelIdx(idx);
          reset(idx);
        }}
        className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
        aria-label={t("solo.level")}
      >
        {SOLO_LEVELS.map((lv, i) => (
          <option key={lv.id} value={i}>
            {locale === "fr" ? lv.labelFr : lv.labelEn}
          </option>
        ))}
      </select>

      <p className="text-center text-sm text-africhess-gold">{label}</p>

      <div className="aspect-square max-w-md mx-auto rounded-xl overflow-hidden border border-white/20">
        <Chessboard
          position={game.fen()}
          boardWidth={360}
          onPieceDrop={onDrop}
          customDarkSquareStyle={squareBase.dark as Record<string, string>}
          customLightSquareStyle={squareBase.light as Record<string, string>}
        />
      </div>

      {message && (
        <p className="text-center text-sm font-medium" role="status">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => reset(levelIdx)}
        className="w-full py-2.5 african-gradient text-white rounded-lg font-medium"
      >
        {t("solo.restart")}
      </button>
    </div>
  );
}
