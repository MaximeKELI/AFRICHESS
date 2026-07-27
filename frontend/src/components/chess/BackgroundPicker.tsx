"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
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

/**
 * Miniature lazy : n’attribue `src` qu’une fois visible.
 * Nécessaire car `loading="lazy"` est peu fiable dans un overflow:scroll,
 * et les full-res Lichess (~0.5–1.5 Mo) saturent la RAM si toutes chargées.
 */
function LazyBackgroundSwatch({ bg }: { bg: BoardBackground }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const thumb = bg.thumbSrc ?? bg.src;

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: el.closest("[data-bg-scroll]") ?? null, rootMargin: "120px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <span
      ref={ref}
      className="relative overflow-hidden rounded shrink-0 ring-1 ring-white/10 w-20 h-10 bg-black/30"
    >
      {visible && thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
      )}
    </span>
  );
}

function BackgroundSwatchPlaceholder() {
  return (
    <span
      className="rounded border border-dashed border-white/25 bg-black/30 shrink-0 w-20 h-10"
      aria-hidden
    />
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
  /** Galerie lourde : repliée par défaut tant qu’on n’a pas choisi « Galerie ». */
  const [galleryExpanded, setGalleryExpanded] = useState(false);
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

  useEffect(() => {
    if (filter === "gallery") setGalleryExpanded(true);
  }, [filter]);

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

          <div
            data-bg-scroll
            className="max-h-[min(48vh,440px)] overflow-y-auto pr-1 scrollbar-thin space-y-4"
          >
            {visibleCategories.map((cat) => {
              const items = BOARD_BACKGROUNDS.filter((b) => b.category === cat);
              if (!items.length) return null;

              const isHeavyGallery = cat === "gallery";
              const showItems = !isHeavyGallery || galleryExpanded || filter === "gallery";

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

                  {isHeavyGallery && !showItems ? (
                    <button
                      type="button"
                      onClick={() => setGalleryExpanded(true)}
                      className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-left text-xs hover:border-africhess-gold/40 transition"
                    >
                      <span className="font-medium text-africhess-gold">
                        {t("background.picker.loadGallery")}
                      </span>
                      <span className="block opacity-55 mt-0.5">
                        {t("background.picker.loadGalleryHint", { count: items.length })}
                      </span>
                    </button>
                  ) : (
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
                            {bg.src ? (
                              <LazyBackgroundSwatch bg={bg} />
                            ) : (
                              <BackgroundSwatchPlaceholder />
                            )}
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
                  )}
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
            backdropSrc={selected?.thumbSrc ?? selected?.src ?? null}
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
