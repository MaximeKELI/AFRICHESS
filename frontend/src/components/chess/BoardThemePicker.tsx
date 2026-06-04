"use client";

import clsx from "clsx";
import {
  BOARD_THEMES,
  getThemedSquareStyles,
  type BoardTheme,
} from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

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
}: {
  theme: BoardTheme;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.labelFr}
      className={clsx(
        "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-[1.02]",
        selected
          ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold/50"
          : "border-white/15 hover:border-white/30"
      )}
      aria-pressed={selected}
      aria-label={`Plateau ${theme.labelFr}`}
    >
      <ThemeSwatch theme={theme} size={compact ? "sm" : "md"} />
      <span className={clsx("leading-tight text-center", compact ? "text-[10px]" : "text-xs")}>
        {theme.labelFr}
      </span>
    </button>
  );
}

export function BoardThemePicker({ compact = false, className }: BoardThemePickerProps) {
  const { boardTheme, setBoardTheme } = usePreferencesStore();
  const classic = BOARD_THEMES.filter((t) => !t.floral);
  const floral = BOARD_THEMES.filter((t) => t.floral);

  const gridClass = clsx(
    "grid gap-2",
    compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"
  );

  return (
    <div className={className}>
      <h3 className={clsx("font-semibold", compact ? "text-sm mb-2" : "mb-3")}>
        Plateau
      </h3>
      <p className={clsx("opacity-60 mb-3", compact ? "text-xs" : "text-sm")}>
        Classiques ou jardins fleuris (♣)
      </p>

      <p className={clsx("opacity-50 mb-2 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
        Classiques
      </p>
      <div className={clsx(gridClass, "mb-4")}>
        {classic.map((theme) => (
          <ThemeButton
            key={theme.id}
            theme={theme}
            compact={compact}
            selected={boardTheme === theme.id}
            onSelect={() => setBoardTheme(theme.id)}
          />
        ))}
      </div>

      <p className={clsx("opacity-50 mb-2 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
        Fleurs ♣
      </p>
      <div className={gridClass}>
        {floral.map((theme) => (
          <ThemeButton
            key={theme.id}
            theme={theme}
            compact={compact}
            selected={boardTheme === theme.id}
            onSelect={() => setBoardTheme(theme.id)}
          />
        ))}
      </div>

      <p className={clsx("opacity-50 mb-2 mt-4 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
        Pièces
      </p>
      <div className="flex gap-2">
        {(["classic", "african"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPieceSet(id)}
            className={clsx(
              "px-3 py-1 rounded text-xs capitalize border",
              pieceSet === id
                ? "border-africhess-gold bg-africhess-gold/20"
                : "border-white/20"
            )}
          >
            {id === "african" ? "Africain ♛" : "Classique"}
          </button>
        ))}
      </div>
    </div>
  );
}
