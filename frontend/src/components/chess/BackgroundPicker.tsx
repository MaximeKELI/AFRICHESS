"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import { Check } from "lucide-react";
import {
  BOARD_BACKGROUNDS,
  BOARD_BACKGROUND_CATEGORY_ORDER,
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

type FilterId = BoardBackgroundCategory | "all";

function BackgroundSwatch({ bg, size }: { bg: BoardBackground; size: "sm" | "md" | "row" }) {
  const dim =
    size === "row" ? "w-full h-10" : size === "sm" ? "w-14 h-10" : "w-16 h-11";
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
  const [filter, setFilter] = useState<FilterId>("all");
  const selected = BOARD_BACKGROUNDS.find((b) => b.id === boardBackground);

  const categoriesWithItems = useMemo(
    () =>
      BOARD_BACKGROUND_CATEGORY_ORDER.filter((cat) =>
        BOARD_BACKGROUNDS.some((b) => b.category === cat)
      ),
    []
  );

  const visibleCategories =
    filter === "all" ? categoriesWithItems : categoriesWithItems.filter((c) => c === filter);

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
        <div className="flex-1 min-w-0 order-2 md:order-1 space-y-3">
          <div
            className="flex flex-wrap gap-1.5 pb-1"
            role="tablist"
            aria-label={t("background.picker.filterLabel")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              onClick={() => setFilter("all")}
              className={clsx(
                "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                filter === "all"
                  ? "border-africhess-gold bg-africhess-gold/15 text-africhess-gold"
                  : "border-white/15 opacity-70 hover:opacity-100"
              )}
            >
              {t("background.picker.category.all")}
            </button>
            {categoriesWithItems
              .filter((c) => c !== "none")
              .map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={filter === cat}
                  onClick={() => setFilter(cat)}
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                    filter === cat
                      ? "border-africhess-gold bg-africhess-gold/15 text-africhess-gold"
                      : "border-white/15 opacity-70 hover:opacity-100"
                  )}
                >
                  {t(`background.picker.category.${cat}`)}
                </button>
              ))}
          </div>

          <div className="max-h-[min(48vh,440px)] overflow-y-auto pr-1 scrollbar-thin space-y-4">
            {visibleCategories.map((cat) => {
              const items = BOARD_BACKGROUNDS.filter((b) => b.category === cat);
              if (!items.length) return null;
              return (
                <section key={cat} className="space-y-2">
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-[color-mix(in_srgb,var(--bg,#111)_94%,transparent)] py-1.5 border-b border-white/10">
                    <h4
                      className={clsx(
                        "font-semibold uppercase tracking-wide text-africhess-gold/90",
                        compact ? "text-[10px]" : "text-xs"
                      )}
                    >
                      {t(`background.picker.category.${cat}`)}
                    </h4>
                    <span className="text-[10px] opacity-40 tabular-nums">{items.length}</span>
                  </div>
                  <div
                    className={clsx(
                      "grid gap-2",
                      compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                    )}
                  >
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
                          <span
                            className={clsx(
                              "truncate pr-1 font-medium",
                              compact ? "text-[11px]" : "text-xs"
                            )}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
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
