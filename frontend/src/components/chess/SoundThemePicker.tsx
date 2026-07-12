"use client";

import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { playChessSound, setChessSoundTheme } from "@/lib/chessSounds";
import { SOUND_THEMES, type SoundThemeId } from "@/lib/soundThemes";
import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";

interface SoundThemePickerProps {
  compact?: boolean;
  className?: string;
  showHeader?: boolean;
}

export function SoundThemePicker({
  compact = false,
  className,
  showHeader = true,
}: SoundThemePickerProps) {
  const { soundTheme, setSoundTheme } = usePreferencesStore();
  const { t } = useTranslation();

  const select = (id: SoundThemeId) => {
    setSoundTheme(id);
    setChessSoundTheme(id);
    if (id !== "silent") {
      playChessSound("move", true);
    }
  };

  return (
    <div className={className}>
      {showHeader && (
        <>
          <h3 className={clsx("font-semibold", compact ? "text-sm mb-2" : "mb-3")}>
            {t("sound.picker.title")}
          </h3>
          <p className={clsx("opacity-60 mb-3", compact ? "text-xs" : "text-sm")}>
            {t("sound.picker.hint")}
          </p>
        </>
      )}

      <div
        className={clsx(
          "grid gap-2",
          compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
        )}
        role="listbox"
        aria-label={t("sound.picker.title")}
      >
        {SOUND_THEMES.map((theme) => {
          const selected = soundTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => select(theme.id)}
              className={clsx(
                "flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-left transition-all hover:scale-[1.01]",
                selected
                  ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold/50"
                  : "border-white/15 hover:border-white/30"
              )}
            >
              <Volume2
                size={compact ? 14 : 16}
                className={clsx(
                  "shrink-0",
                  theme.id === "silent" ? "opacity-30" : "text-africhess-gold/80"
                )}
                aria-hidden
              />
              <span className={clsx("leading-tight", compact ? "text-[11px]" : "text-xs")}>
                {t(theme.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
