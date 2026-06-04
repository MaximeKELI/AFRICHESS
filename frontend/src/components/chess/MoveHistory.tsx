"use client";

import { useEffect, useRef } from "react";
import type { MoveRow } from "@/lib/chessDisplay";

interface MoveHistoryProps {
  moves: MoveRow[];
  currentPly?: number;
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves.length]);

  return (
    <div className="flex flex-col h-full min-h-[120px] max-h-[220px]">
      <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">
        Coups joués
      </h3>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto font-mono text-sm space-y-0.5 pr-1 scrollbar-thin"
      >
        {moves.length === 0 ? (
          <p className="text-xs opacity-40 py-2">Aucun coup pour l&apos;instant</p>
        ) : (
          moves.map((row) => (
            <div
              key={row.number}
              className="grid grid-cols-[2rem_1fr_1fr] gap-1 py-0.5 px-1 rounded hover:bg-white/5"
            >
              <span className="opacity-50">{row.number}.</span>
              <span className={row.white ? "text-[var(--text)]" : ""}>{row.white ?? "…"}</span>
              <span className={row.black ? "text-[var(--text)]" : "opacity-30"}>
                {row.black ?? ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
