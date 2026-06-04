"use client";

import { Chessboard } from "react-chessboard";

export function MiniBoard({ fen }: { fen: string }) {
  return (
    <div className="my-4 w-48 aspect-square mx-auto rounded-lg overflow-hidden border border-white/20">
      <Chessboard position={fen} arePiecesDraggable={false} boardWidth={192} />
    </div>
  );
}
