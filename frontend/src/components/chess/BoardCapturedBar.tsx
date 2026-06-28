"use client";

import { usePreferencesStore } from "@/store/preferences";
import { CapturedPieceIcon } from "./CapturedPieceIcon";

interface BoardCapturedBarProps {
  pieces: string[];
  advantage?: number;
}

export function BoardCapturedBar({ pieces, advantage }: BoardCapturedBarProps) {
  const pieceSet = usePreferencesStore((s) => s.pieceSet);
  const isEmpty = pieces.length === 0 && !advantage;

  return (
    <div
      className={`board-captured-bar ${isEmpty ? "board-captured-bar-empty" : ""}`}
      aria-hidden={isEmpty}
    >
      <div className="board-captured-pieces">
        {pieces.map((key, i) => (
          <CapturedPieceIcon key={`${key}-${i}`} pieceKey={key} size={22} pieceSet={pieceSet} />
        ))}
      </div>
      {advantage != null && advantage > 0 && (
        <span className="board-captured-advantage">+{advantage}</span>
      )}
    </div>
  );
}
