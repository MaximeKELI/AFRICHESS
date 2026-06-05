"use client";

import clsx from "clsx";
import {
  BOARD_THEMES,
  getThemedSquareStyles,
  type BoardTheme,
} from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";
import { boardThemeLabel } from "@/lib/i18n/labels";

interface BoardThemePickerProps {
  compact?: boolean;
  className?: string;
}

function ThemeSwatch({ theme, size }: { theme: BoardTheme; size: "sm" | "md" }) {
  const { dark, light } = getThemedSquareStyles(theme);
  const dim = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  return (
    <span className={clsx("grid grid-cols-2 overflow-hidden shrink-0 rounded", dim)}>
      <span style={light} />
      <span style={dark} />
      <span style={dark} />
      <span style={light} />
    </span>
  );
}

function ThemeButton({
  theme,
  selected,
  compact,
  onSelect,
  label,
}: {
  theme: BoardTheme;
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
      aria-label={`${label}`}
    >
      <ThemeSwatch theme={theme} size={compact ? "sm" : "md"} />
      <span className={clsx("leading-tight text-center", compact ? "text-[10px]" : "text-xs")}>
        {label}
      </span>
    </button>
  );
}

export function BoardThemePicker({ compact = false, className }: BoardThemePickerProps) {
  const { boardTheme, setBoardTheme, pieceSet, setPieceSet } = usePreferencesStore();
  const { t } = useTranslation();
  const classic = BOARD_THEMES.filter((t) => !t.floral);
  const floral = BOARD_THEMES.filter((t) => t.floral);

  const gridClass = clsx(
    "grid gap-2",
    compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"
  );

  return (
    <div className={className}>
      <h3 className={clsx("font-semibold", compact ? "text-sm mb-2" : "mb-3")}>
        {t("board.picker.title")}
      </h3>
      <p className={clsx("opacity-60 mb-3", compact ? "text-xs" : "text-sm")}>
        {t("board.picker.hint")}
      </p>

      <p className={clsx("opacity-50 mb-2 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
        {t("board.picker.classics")}
      </p>
      <div className={clsx(gridClass, "mb-4")}>
        {classic.map((theme) => (
          <ThemeButton
            key={theme.id}
            theme={theme}
            compact={compact}
            selected={boardTheme === theme.id}
            onSelect={() => setBoardTheme(theme.id)}
            label={boardThemeLabel(t, theme.id, theme.labelFr)}
          />
        ))}
      </div>

      <p className={clsx("opacity-50 mb-2 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
        {t("board.picker.floral")}
      </p>
      <div className={gridClass}>
        {floral.map((theme) => (
          <ThemeButton
            key={theme.id}
            theme={theme}
            compact={compact}
            selected={boardTheme === theme.id}
            onSelect={() => setBoardTheme(theme.id)}
            label={boardThemeLabel(t, theme.id, theme.labelFr)}
          />
        ))}
      </div>

      <p className={clsx("opacity-50 mb-2 mt-4 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
        {t("board.picker.pieces")}
      </p>
      <div className="flex gap-2">
        {(["classic", "african", "african-svg"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPieceSet(id)}
            aria-pressed={pieceSet === id}
            aria-label={
              id === "african-svg"
                ? t("board.picker.africanSvg")
                : id === "african"
                  ? t("board.picker.african")
                  : t("board.picker.classic")
            }
            className={clsx(
              "px-3 py-1 rounded text-xs capitalize border focus-visible:outline focus-visible:outline-2 focus-visible:outline-africhess-gold",
              pieceSet === id
                ? "border-africhess-gold bg-africhess-gold/20"
                : "border-white/20"
            )}
          >
            {id === "african-svg"
              ? t("board.picker.africanSvg")
              : id === "african"
                ? t("board.picker.african")
                : t("board.picker.classic")}
          </button>
        ))}
      </div>
    </div>
  );
}
