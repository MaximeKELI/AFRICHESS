"use client";

import { Volume2, VolumeX, Palette } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  PUZZLE_GARDEN_THEMES,
  isThemeUnlocked,
  type PuzzleGardenThemeId,
  type ThemeUnlockContext,
} from "@/lib/puzzleGardenThemes";
import { usePuzzlePreferencesStore } from "@/store/puzzlePreferences";

interface PuzzleSettingsPanelProps {
  unlockCtx: ThemeUnlockContext;
}

export function PuzzleSettingsPanel({ unlockCtx }: PuzzleSettingsPanelProps) {
  const { t } = useTranslation();
  const { soundsEnabled, soundVolume, gardenTheme, setSoundsEnabled, setSoundVolume, setGardenTheme } =
    usePuzzlePreferencesStore();

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="flex items-center gap-2 font-medium mb-2">
          {soundsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {t("puzzles.settings.sounds")}
        </label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={soundsEnabled}
            onChange={(e) => setSoundsEnabled(e.target.checked)}
          />
          <span className="opacity-80">{t("puzzles.settings.soundsOn")}</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(soundVolume * 100)}
          disabled={!soundsEnabled}
          onChange={(e) => setSoundVolume(Number(e.target.value) / 100)}
          className="w-full accent-africhess-gold"
          aria-label={t("puzzles.settings.volume")}
        />
      </div>

      <div>
        <label className="flex items-center gap-2 font-medium mb-2">
          <Palette size={16} />
          {t("puzzles.settings.gardenTheme")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PUZZLE_GARDEN_THEMES.map((theme) => {
            const unlocked = isThemeUnlocked(theme.id, unlockCtx);
            const active = gardenTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                disabled={!unlocked}
                onClick={() => setGardenTheme(theme.id as PuzzleGardenThemeId)}
                className={`px-2 py-2 rounded-lg border text-xs text-left transition-colors ${
                  active
                    ? "border-africhess-gold bg-africhess-gold/15 text-africhess-gold"
                    : unlocked
                      ? "border-white/15 hover:border-africhess-green/50"
                      : "border-white/10 opacity-45 cursor-not-allowed"
                }`}
                title={unlocked ? t(theme.labelKey) : t(theme.unlockKey)}
              >
                <span className="block font-medium">{t(theme.labelKey)}</span>
                {!unlocked && <span className="text-[10px] opacity-60">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
