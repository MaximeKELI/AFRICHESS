"use client";

import { Download } from "lucide-react";
import { buildPgn, downloadPgn } from "@/lib/pgnExport";
import type { ApiMove } from "@/lib/chessDisplay";
import { useTranslation } from "@/hooks/useTranslation";

interface PgnExportButtonProps {
  pgn?: string;
  moves?: ApiMove[];
  white?: string;
  black?: string;
  result?: string;
  gameId?: string;
  className?: string;
}

export function PgnExportButton({
  pgn,
  moves,
  white,
  black,
  result,
  gameId,
  className = "",
}: PgnExportButtonProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    const text = buildPgn({ pgn, moves, white, black, result });
    const name = gameId ? `africhess-${gameId.slice(0, 8)}.pgn` : "africhess-partie.pgn";
    downloadPgn(text, name);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 ${className}`}
      aria-label={t("pgn.export")}
    >
      <Download size={14} aria-hidden />
      {t("pgn.export")}
    </button>
  );
}
