"use client";

import clsx from "clsx";
import Image from "next/image";
import { Check } from "lucide-react";
import {
  BOARD_BACKGROUNDS,
  boardBackgroundLabel,
  type BoardBackground,
  type BoardBackgroundCategory,
} from "@/lib/boardBackgrounds";
import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";
import { StyleBoardPreview } from "@/components/chess/StyleBoardPreview";

interface BackgroundPickerProps {
  compact?: boolean;
  className?: string;
  showHeader?: boolean;
}

const CATEGORY_ORDER: BoardBackgroundCategory[] = [
  "animals",
  "africa",
  "nature",
  "classic",
  "abstract",
  "lichess",
];

function BackgroundSwatch({ bg, size }: { bg: BoardBackground; size: "sm" | "md" | "row" }) {
  const dim =
    size === "row" ? "w-full h-9" : size === "sm" ? "w-14 h-10" : "w-16 h-11";
  if (!bg.src) {
    return (
      <span
        className={clsx(
          "rounded border border-dashed border-white/25 bg-black/30 shrink-0",
          dim
        )}
        aria-hidden
      />
    );
  }
  return (
    <span className={clsx("relative overflow-hidden rounded shrink-0 ring-1 ring-white/10", dim)}>
      <Image src={bg.src} alt="" fill className="object-cover" sizes="160px" />
    </span>
  );
}

export function BackgroundPicker({
  compact = false,
  className,
  showHeader = true,
}: BackgroundPickerProps) {
  const { boardBackground, setBoardBackground, boardTheme, pieceSet } = usePreferencesStore();
  const { t, locale } = useTranslation();
  const selected = BOARD_BACKGROUNDS.find((b) => b.id === boardBackground);

  return (
    <div className={className}>
      {showHeader && (
        <>
          <h3 className={clsx("font-semibold", compact ? "text-sm mb-2" : "mb-3")}>
            {t("background.picker.title")}
          </h3>
          <p className={clsx("opacity-60 mb-3", compact ? "text-xs" : "text-sm")}>
            {t("background.picker.hint")}
          </p>
        </>
      )}

      <div
        className={clsx(
          "flex gap-3",
          compact ? "flex-col" : "flex-col md:flex-row md:items-start"
        )}
      >
        <div className="flex-1 min-w-0 max-h-[min(48vh,420px)] overflow-y-auto pr-1 scrollbar-thin space-y-3 order-2 md:order-1">
          {CATEGORY_ORDER.map((cat) => {
            const items = BOARD_BACKGROUNDS.filter((b) => b.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p
                  className={clsx(
                    "opacity-50 mb-1.5 uppercase tracking-wide sticky top-0 bg-[color-mix(in_srgb,var(--bg,#111)_92%,transparent)] py-1 z-10",
                    compact ? "text-[10px]" : "text-xs"
                  )}
                >
                  {t(`background.picker.category.${cat}`)}
                </p>
                <div className="space-y-1.5">
                  {items.map((bg) => {
                    const label = boardBackgroundLabel(locale, bg);
                    const isSelected = boardBackground === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBoardBackground(bg.id)}
                        title={label}
                        aria-pressed={isSelected}
                        aria-label={label}
                        className={clsx(
                          "relative w-full flex items-center gap-2.5 rounded-lg border-2 p-1.5 text-left transition-all",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10 hover:border-white/25 bg-black/20"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-1 left-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                          </span>
                        )}
                        <BackgroundSwatch bg={bg} size="row" />
                        <span className={clsx("truncate pr-1", compact ? "text-[11px]" : "text-xs")}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="order-1 md:order-2 shrink-0 flex flex-col items-center gap-2 md:sticky md:top-2">
          <p className="text-[10px] uppercase tracking-wide opacity-50">
            {t("board.picker.preview")}
          </p>
          <StyleBoardPreview
            boardThemeId={boardTheme}
            pieceSetId={pieceSet}
            squareSize={compact ? 48 : 58}
            backdropSrc={selected?.src ?? null}
          />
          {selected && (
            <p className="text-[11px] opacity-70 text-center max-w-[11rem] line-clamp-2">
              {boardBackgroundLabel(locale, selected)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
