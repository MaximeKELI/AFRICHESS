"use client";

import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { customPiecesForSet } from "@/lib/pieceSets";
import { usePreferencesStore } from "@/store/preferences";

export function MiniBoard({ fen }: { fen: string }) {
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const pieceSet = usePreferencesStore((s) => s.pieceSet);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);
  const customPieces = useMemo(() => customPiecesForSet(pieceSet), [pieceSet]);

  return (
    <div className="my-4 w-48 aspect-square mx-auto rounded-lg overflow-hidden border border-white/20">
      <Chessboard
        position={fen}
        arePiecesDraggable={false}
        boardWidth={192}
        customDarkSquareStyle={squareBase.dark as Record<string, string>}
        customLightSquareStyle={squareBase.light as Record<string, string>}
        {...(customPieces ? { customPieces } : {})}
      />
    </div>
  );
}
