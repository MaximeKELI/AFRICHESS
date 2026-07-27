"use client";

import clsx from "clsx";
import { Volume2 } from "lucide-react";
import {
  playChessSound,
  setChessSoundTheme,
  setChessSoundVolume,
  setMateSoundTheme,
} from "@/lib/chessSounds";
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
  const {
    soundTheme,
    setSoundTheme,
    mateSoundTheme,
    setMateSoundTheme: setMatePref,
    soundVolume,
    setSoundVolume,
  } = usePreferencesStore();
  const { t } = useTranslation();

  const select = (id: SoundThemeId) => {
    setSoundTheme(id);
    setChessSoundTheme(id);
    if (id !== "silent") {
      playChessSound("move", true);
    }
  };

  const selectMate = (id: SoundThemeId | null) => {
    setMatePref(id);
    setMateSoundTheme(id);
    if (id !== "silent" && (id != null || soundTheme !== "silent")) {
      playChessSound("checkmate", true);
    }
  };

  const onVolume = (value: number) => {
    setSoundVolume(value);
    setChessSoundVolume(value);
  };

  const mateOptions: Array<{ id: SoundThemeId | null; label: string }> = [
    { id: null, label: t("sound.mate.inherit") },
    ...SOUND_THEMES.map((theme) => ({
      id: theme.id as SoundThemeId,
      label: t(theme.labelKey),
    })),
  ];

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

      <div className={clsx("mb-3", compact ? "space-y-1" : "space-y-2")}>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="sound-volume" className={clsx("opacity-70", compact ? "text-xs" : "text-sm")}>
            {t("sound.volume")}
          </label>
          <span className="text-[11px] font-mono opacity-50 tabular-nums">
            {Math.round(soundVolume * 100)}%
          </span>
        </div>
        <input
          id="sound-volume"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(soundVolume * 100)}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          onMouseUp={() => {
            if (soundTheme !== "silent") playChessSound("move", true);
          }}
          onTouchEnd={() => {
            if (soundTheme !== "silent") playChessSound("move", true);
          }}
          className="w-full accent-africhess-gold"
        />
      </div>

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

      <div className={clsx(compact ? "mt-3" : "mt-4")}>
        <p className={clsx("font-medium mb-1.5", compact ? "text-xs" : "text-sm")}>
          {t("sound.mate.title")}
        </p>
        <p className={clsx("opacity-55 mb-2", compact ? "text-[10px]" : "text-xs")}>
          {t("sound.mate.hint")}
        </p>
        <div
          className={clsx(
            "grid gap-1.5",
            compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
          )}
          role="listbox"
          aria-label={t("sound.mate.title")}
        >
          {mateOptions.map((opt) => {
            const selected = mateSoundTheme === opt.id;
            return (
              <button
                key={opt.id ?? "inherit"}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => selectMate(opt.id)}
                className={clsx(
                  "rounded-lg border px-2 py-1.5 text-left transition-colors",
                  compact ? "text-[10px]" : "text-xs",
                  selected
                    ? "border-africhess-terracotta bg-africhess-terracotta/15 text-africhess-terracotta"
                    : "border-white/12 hover:border-white/25 opacity-90"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => playChessSound("move", true)}
            className="text-[11px] px-2 py-1 rounded-md border border-white/15 hover:border-africhess-gold/40"
          >
            {t("sound.preview.move")}
          </button>
          <button
            type="button"
            onClick={() => playChessSound("check", true)}
            className="text-[11px] px-2 py-1 rounded-md border border-white/15 hover:border-africhess-gold/40"
          >
            {t("sound.preview.check")}
          </button>
          <button
            type="button"
            onClick={() => playChessSound("checkmate", true)}
            className="text-[11px] px-2 py-1 rounded-md border border-white/15 hover:border-africhess-terracotta/50"
          >
            {t("sound.preview.mate")}
          </button>
        </div>
      </div>
    </div>
  );
}
