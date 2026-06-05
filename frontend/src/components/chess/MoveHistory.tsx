"use client";

import { useEffect, useRef } from "react";
import type { MoveRow } from "@/lib/chessDisplay";
import { useTranslation } from "@/hooks/useTranslation";

interface MoveHistoryProps {
  moves: MoveRow[];
  currentPly?: number;
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves.length]);

  return (
    <div className="flex flex-col min-h-[140px] max-h-[min(42vh,280px)] sm:max-h-[min(50vh,360px)]">
      <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2 shrink-0">
        {t("chess.moves.title")}
      </h3>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-sm sm:text-[15px] space-y-0.5 pr-1 scrollbar-thin -mx-1 px-1"
      >
        {moves.length === 0 ? (
          <p className="text-xs opacity-40 py-2">{t("chess.moves.empty")}</p>
        ) : (
          moves.map((row) => (
            <div
              key={row.number}
              className="grid grid-cols-[2.25rem_1fr_1fr] gap-1.5 py-1.5 px-1.5 rounded-md hover:bg-white/5 min-h-[2.25rem] items-center"
            >
              <span className="opacity-50 tabular-nums">{row.number}.</span>
              <span className={row.white ? "text-[var(--text)]" : "opacity-40"}>
                {row.white ?? "…"}
              </span>
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
