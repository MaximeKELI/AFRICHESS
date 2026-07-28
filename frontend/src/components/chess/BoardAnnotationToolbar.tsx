"use client";

import { memo } from "react";
import clsx from "clsx";
import { Eraser, MousePointer2, Circle, ArrowUpRight } from "lucide-react";
import { ARROW_BRUSHES, type ArrowBrushId } from "@/lib/boardArrows";
import { useTranslation } from "@/hooks/useTranslation";

export type BoardAnnotationTool = "move" | "arrow" | "circle";

interface BoardAnnotationToolbarProps {
  tool: BoardAnnotationTool;
  arrowColor: ArrowBrushId;
  onToolChange: (tool: BoardAnnotationTool) => void;
  onArrowColorChange: (color: ArrowBrushId) => void;
  onClear: () => void;
  compact?: boolean;
}

const COLOR_KEYS: ArrowBrushId[] = ["orange", "green", "red", "blue", "yellow"];

export const BoardAnnotationToolbar = memo(function BoardAnnotationToolbar({
  tool,
  arrowColor,
  onToolChange,
  onArrowColorChange,
  onClear,
  compact = false,
}: BoardAnnotationToolbarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-white/15 bg-black/35 px-2 py-1.5",
        compact ? "text-[10px]" : "text-xs"
      )}
      role="toolbar"
      aria-label={t("chess.arrows.toolbar")}
    >
      <button
        type="button"
        title={t("chess.arrows.toolMove")}
        aria-pressed={tool === "move"}
        onClick={() => onToolChange("move")}
        className={clsx(
          "inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors",
          tool === "move"
            ? "border-africhess-gold/50 bg-africhess-gold/15 text-africhess-gold"
            : "border-white/15 hover:bg-white/10"
        )}
      >
        <MousePointer2 className="w-3.5 h-3.5" aria-hidden />
        {!compact && <span>{t("chess.arrows.toolMove")}</span>}
      </button>
      <button
        type="button"
        title={t("chess.arrows.toolArrow")}
        aria-pressed={tool === "arrow"}
        onClick={() => onToolChange("arrow")}
        className={clsx(
          "inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors",
          tool === "arrow"
            ? "border-africhess-gold/50 bg-africhess-gold/15 text-africhess-gold"
            : "border-white/15 hover:bg-white/10"
        )}
      >
        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        {!compact && <span>{t("chess.arrows.toolArrow")}</span>}
      </button>
      <button
        type="button"
        title={t("chess.arrows.toolCircle")}
        aria-pressed={tool === "circle"}
        onClick={() => onToolChange("circle")}
        className={clsx(
          "inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors",
          tool === "circle"
            ? "border-africhess-gold/50 bg-africhess-gold/15 text-africhess-gold"
            : "border-white/15 hover:bg-white/10"
        )}
      >
        <Circle className="w-3.5 h-3.5" aria-hidden />
        {!compact && <span>{t("chess.arrows.toolCircle")}</span>}
      </button>
      <span className="w-px h-5 bg-white/15 mx-0.5" aria-hidden />
      {COLOR_KEYS.map((id) => (
        <button
          key={id}
          type="button"
          title={t(`chess.arrows.color.${id}`)}
          aria-pressed={tool === "arrow" && arrowColor === id}
          onClick={() => {
            onArrowColorChange(id);
            onToolChange("arrow");
          }}
          className={clsx(
            "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
            tool === "arrow" && arrowColor === id
              ? "border-white scale-110"
              : "border-white/30"
          )}
          style={{ background: ARROW_BRUSHES[id] }}
        />
      ))}
      <button
        type="button"
        title={t("chess.arrows.clear")}
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 hover:bg-white/10"
      >
        <Eraser className="w-3.5 h-3.5" aria-hidden />
        {!compact && <span>{t("chess.arrows.clear")}</span>}
      </button>
    </div>
  );
});
