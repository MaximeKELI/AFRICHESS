"use client";

import clsx from "clsx";
import {
  DEFAULT_TIME_PRESET,
  presetLabel,
  TIME_CATEGORIES,
  type TimePresetId,
} from "@/lib/timeControl";
import { useTranslation } from "@/hooks/useTranslation";

interface TimeControlPickerProps {
  isTimed: boolean;
  preset: TimePresetId;
  onTimedChange: (timed: boolean) => void;
  onPresetChange: (preset: TimePresetId) => void;
  compact?: boolean;
}

export function TimeControlPicker({
  isTimed,
  preset,
  onTimedChange,
  onPresetChange,
  compact = false,
}: TimeControlPickerProps) {
  const { t } = useTranslation();
  const activePreset = preset || DEFAULT_TIME_PRESET;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={clsx("font-medium", compact ? "text-xs" : "text-sm")}>
        {t("time.title")}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTimedChange(false)}
          className={clsx(
            "flex-1 py-2 rounded-lg border text-sm transition-all",
            !isTimed
              ? "border-africhess-gold bg-africhess-gold/15"
              : "border-white/15 hover:border-white/30"
          )}
        >
          {t("time.unlimited")}
        </button>
        <button
          type="button"
          onClick={() => onTimedChange(true)}
          className={clsx(
            "flex-1 py-2 rounded-lg border text-sm transition-all",
            isTimed
              ? "border-africhess-gold bg-africhess-gold/15"
              : "border-white/15 hover:border-white/30"
          )}
        >
          {t("time.timed")}
        </button>
      </div>
      {isTimed && (
        <div className="space-y-3">
          {TIME_CATEGORIES.map(({ id, presets }) => (
            <div key={id}>
              <p className="text-[11px] uppercase tracking-wide opacity-50 mb-1.5">
                {t(`time.category.${id}`)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPresetChange(p)}
                    className={clsx(
                      "min-w-[3.25rem] px-2.5 py-1.5 rounded-lg border text-sm font-mono transition-all",
                      activePreset === p
                        ? "border-africhess-green bg-africhess-green/15 text-africhess-green"
                        : "border-white/15 hover:border-white/25"
                    )}
                  >
                    {presetLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs opacity-55">
        {isTimed
          ? t("time.hint.preset", { preset: presetLabel(activePreset) })
          : t("time.hint.unlimited")}
      </p>
    </div>
  );
}
