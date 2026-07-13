"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { MoveRow } from "@/lib/chessDisplay";
import { useTranslation } from "@/hooks/useTranslation";

interface MoveHistoryProps {
  moves: MoveRow[];
  currentPly?: number;
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

export const MoveHistory = memo(function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves.length]);

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

  return (
    <div className="flex flex-col min-h-[140px] max-h-[min(42vh,280px)] sm:max-h-[min(50vh,360px)]">
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
          {t("chess.moves.title")}
        </h3>
        {moves.length > 0 && (
          <button
            type="button"
            onClick={() => void onCopy()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--gold)] transition-colors hover:bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
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
});
