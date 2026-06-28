"use client";

import clsx from "clsx";
import Image from "next/image";
import {
  BOARD_BACKGROUNDS,
  boardBackgroundLabel,
  type BoardBackground,
  type BoardBackgroundCategory,
} from "@/lib/boardBackgrounds";
import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";

interface BackgroundPickerProps {
  compact?: boolean;
  className?: string;
  showHeader?: boolean;
}

function BackgroundSwatch({ bg, size }: { bg: BoardBackground; size: "sm" | "md" }) {
  const dim = size === "sm" ? "w-14 h-10" : "w-16 h-11";
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
      <Image src={bg.src} alt="" fill className="object-cover" sizes="64px" />
    </span>
  );
}

function BackgroundButton({
  bg,
  selected,
  compact,
  onSelect,
  label,
}: {
  bg: BoardBackground;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      className={clsx(
        "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-[1.02]",
        selected
          ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold/50"
          : "border-white/15 hover:border-white/30"
      )}
      aria-pressed={selected}
      aria-label={label}
    >
      <BackgroundSwatch bg={bg} size={compact ? "sm" : "md"} />
      <span className={clsx("leading-tight text-center line-clamp-2", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </span>
    </button>
  );
}

const CATEGORY_ORDER: BoardBackgroundCategory[] = ["africa", "nature", "classic", "abstract"];

export function BackgroundPicker({ compact = false, className, showHeader = true }: BackgroundPickerProps) {
  const { boardBackground, setBoardBackground } = usePreferencesStore();
  const { t, locale } = useTranslation();

  const gridClass = clsx(
    "grid gap-2",
    compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
  );

  const categoryLabel = (cat: BoardBackgroundCategory) => t(`background.picker.category.${cat}`);

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

      {CATEGORY_ORDER.map((cat) => {
        const items = BOARD_BACKGROUNDS.filter((b) => b.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat} className="mb-4 last:mb-0">
            <p
              className={clsx(
                "opacity-50 mb-2 uppercase tracking-wide",
                compact ? "text-[10px]" : "text-xs"
              )}
            >
              {categoryLabel(cat)}
            </p>
            <div className={gridClass}>
              {items.map((bg) => (
                <BackgroundButton
                  key={bg.id}
                  bg={bg}
                  compact={compact}
                  selected={boardBackground === bg.id}
                  onSelect={() => setBoardBackground(bg.id)}
                  label={boardBackgroundLabel(locale, bg)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
