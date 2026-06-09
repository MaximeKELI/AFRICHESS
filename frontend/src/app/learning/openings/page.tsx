"use client";

import { useCallback, useEffect, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { gamesApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { buildGameDisplayFromUciList } from "@/lib/chessDisplay";
import { openingNameFromMoves } from "@/lib/openings";
import { BookOpen } from "lucide-react";

interface OpeningInfo {
  name: string;
  eco: string;
  children: string[];
  path: string;
}

export default function OpeningExplorerPage() {
  const { t, locale } = useTranslation();
  const [moves, setMoves] = useState<string[]>([]);
  const [info, setInfo] = useState<OpeningInfo | null>(null);
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  const refresh = useCallback(
    (line: string[]) => {
      gamesApi
        .openingLookup(line, locale)
        .then(({ data }) => setInfo(data))
        .catch(() =>
          setInfo({ name: openingNameFromMoves(line), eco: "", children: [], path: "" })
        );
    },
    [locale]
  );

  useEffect(() => {
    refresh(moves);
  }, [moves, refresh]);

  const display = buildGameDisplayFromUciList(fen, []);

  const playSan = (san: string) => {
    setMoves((prev) => {
      const next = [...prev, san];
      refresh(next);
      return next;
    });
  };

  const reset = () => {
    setMoves([]);
    setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  const pop = () => {
    setMoves((prev) => {
      const next = prev.slice(0, -1);
      refresh(next);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2">
        <BookOpen className="text-africhess-gold" />
        {t("openings.title")}
      </h1>
      <p className="opacity-70 text-sm">{t("openings.subtitle")}</p>

      <div className="glass-card p-4">
        <p className="text-lg font-semibold text-africhess-gold">
          {info?.name || t("openings.start")}
        </p>
        {info?.eco && <p className="text-xs opacity-50 mt-1">ECO {info.eco}</p>}
        <p className="text-sm font-mono mt-2 opacity-80">
          {moves.length ? moves.join(" ") : "—"}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="w-full min-w-0 max-w-md mx-auto">
          <p className="text-xs opacity-50 mb-2 text-center">{t("openings.boardHint")}</p>
          <ChessBoard
            fen={display?.fen ?? fen}
            orientation="white"
            playerColor="w"
            playSoundOnFenChange={false}
          />
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-sm">{t("openings.continue")}</h2>
          <div className="flex flex-wrap gap-2">
            {(info?.children ?? ["e4", "d4", "Nf3", "c4"]).map((san) => (
              <button
                key={san}
                type="button"
                onClick={() => playSan(san)}
                className="px-4 py-2 rounded-lg border hover:border-africhess-gold font-mono text-sm"
              >
                {san}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={pop} disabled={!moves.length} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">
              {t("openings.back")}
            </button>
            <button type="button" onClick={reset} className="px-3 py-1.5 text-sm border rounded-lg">
              {t("openings.reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
