"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import type { MoveRow } from "@/lib/chessDisplay";
import { plyForMoveCell } from "@/lib/plyNavigation";
import { MoveNavControls } from "./MoveNavControls";
import { useTranslation } from "@/hooks/useTranslation";

interface MoveHistoryProps {
  moves: MoveRow[];
  /** Demi-coups appliqués (0 = départ, total = live). */
  currentPly?: number;
  totalPlies?: number;
  isLive?: boolean;
  onSelectPly?: (ply: number) => void;
  onGoLive?: () => void;
  showNav?: boolean;
  /** Liste flexible qui occupe la hauteur restante (panneau latéral). */
  fillHeight?: boolean;
}

function formatMovesForClipboard(moves: MoveRow[]): string {
  return moves
    .map((row) => {
      const parts = [`${row.number}.`];
      if (row.white) parts.push(row.white);
      if (row.black) parts.push(row.black);
      return parts.join(" ");
    })
    .join(" ");
}

export const MoveHistory = memo(function MoveHistory({
  moves,
  currentPly,
  totalPlies = 0,
  isLive = true,
  onSelectPly,
  onGoLive,
  showNav = false,
  fillHeight = false,
}: MoveHistoryProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectable = Boolean(onSelectPly);

  useEffect(() => {
    if (isLive && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    } else if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [moves.length, currentPly, isLive]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const onCopy = useCallback(async () => {
    if (!moves.length) return;
    const text = formatMovesForClipboard(moves);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  }, [moves]);

  const ply = currentPly ?? totalPlies;

  return (
    <div
      className={
        fillHeight
          ? "flex flex-col flex-1 min-h-0"
          : "flex flex-col min-h-[140px] max-h-[min(42vh,280px)] sm:max-h-[min(50vh,360px)]"
      }
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
          {t("chess.moves.title")}
        </h3>
        {moves.length > 0 && (
          <button
            type="button"
            onClick={() => void onCopy()}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium opacity-80 transition-colors hover:opacity-100 hover:border-africhess-gold/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" aria-hidden />
                {t("chess.moves.copied")}
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden />
                {t("chess.moves.copy")}
              </>
            )}
          </button>
        )}
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-sm sm:text-[15px] space-y-0.5 pr-1 scrollbar-thin -mx-1 px-1 min-h-0"
      >
        {moves.length === 0 ? (
          <p className="text-xs opacity-40 py-2">{t("chess.moves.empty")}</p>
        ) : (
          moves.map((row) => {
            const whitePly = plyForMoveCell(row.number, "w");
            const blackPly = plyForMoveCell(row.number, "b");
            const whiteActive = currentPly != null && currentPly === whitePly;
            const blackActive = currentPly != null && currentPly === blackPly;

            return (
              <div
                key={row.number}
                className="grid grid-cols-[2.25rem_1fr_1fr] gap-1.5 py-0.5 px-1 rounded-md min-h-[2.25rem] items-center"
              >
                <span className="opacity-50 tabular-nums">{row.number}.</span>
                {row.white ? (
                  <button
                    type="button"
                    ref={whiteActive ? activeRef : undefined}
                    disabled={!selectable}
                    onClick={() => onSelectPly?.(whitePly)}
                    className={clsx(
                      "text-left rounded px-1 py-1 transition-colors",
                      selectable && "hover:bg-white/10 cursor-pointer",
                      !selectable && "cursor-default",
                      whiteActive && "bg-africhess-gold/25 text-africhess-gold font-semibold"
                    )}
                  >
                    {row.white}
                  </button>
                ) : (
                  <span className="opacity-40 px-1">…</span>
                )}
                {row.black ? (
                  <button
                    type="button"
                    ref={blackActive ? activeRef : undefined}
                    disabled={!selectable}
                    onClick={() => onSelectPly?.(blackPly)}
                    className={clsx(
                      "text-left rounded px-1 py-1 transition-colors",
                      selectable && "hover:bg-white/10 cursor-pointer",
                      !selectable && "cursor-default",
                      blackActive && "bg-africhess-gold/25 text-africhess-gold font-semibold"
                    )}
                  >
                    {row.black}
                  </button>
                ) : (
                  <span className="opacity-30 px-1" />
                )}
              </div>
            );
          })
        )}
      </div>
      {showNav && onSelectPly && (
        <MoveNavControls
          ply={ply}
          total={totalPlies}
          isLive={isLive}
          onFirst={() => onSelectPly(0)}
          onPrev={() => onSelectPly(Math.max(0, ply - 1))}
          onNext={() => onSelectPly(Math.min(totalPlies, ply + 1))}
          onLast={() => onSelectPly(totalPlies)}
          onLive={onGoLive}
        />
      )}
    </div>
  );
});
