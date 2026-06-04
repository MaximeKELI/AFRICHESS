"use client";

import clsx from "clsx";
import { BOARD_THEMES, type BoardThemeId } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

interface BoardThemePickerProps {
  compact?: boolean;
  className?: string;
}

export function BoardThemePicker({ compact = false, className }: BoardThemePickerProps) {
  const { boardTheme, setBoardTheme } = usePreferencesStore();

  return (
    <div className={className}>
      <h3 className={clsx("font-semibold", compact ? "text-sm mb-2" : "mb-3")}>
        Plateau
      </h3>
      <p className={clsx("opacity-60 mb-3", compact ? "text-xs" : "text-sm")}>
        Choisissez les couleurs de l&apos;échiquier
      </p>
      <div
        className={clsx(
          "grid gap-2",
          compact ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4"
        )}
      >
        {BOARD_THEMES.map((theme) => {
          const selected = boardTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setBoardTheme(theme.id as BoardThemeId)}
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
              <span
                className={clsx(
                  "grid grid-cols-2 overflow-hidden shrink-0",
                  compact ? "w-9 h-9 rounded" : "w-11 h-11 rounded-md"
                )}
              >
                <span style={{ backgroundColor: theme.light }} />
                <span style={{ backgroundColor: theme.dark }} />
                <span style={{ backgroundColor: theme.dark }} />
                <span style={{ backgroundColor: theme.light }} />
              </span>
              <span
                className={clsx(
                  "leading-tight text-center",
                  compact ? "text-[10px]" : "text-xs"
                )}
              >
                {theme.labelFr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
