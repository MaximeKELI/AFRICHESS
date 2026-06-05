"use client";

import clsx from "clsx";
import {
  DEFAULT_TIME_MINUTES,
  TIME_MINUTES_OPTIONS,
  type TimeMinutes,
} from "@/lib/timeControl";
import { useTranslation } from "@/hooks/useTranslation";

interface TimeControlPickerProps {
  isTimed: boolean;
  minutes: TimeMinutes;
  onTimedChange: (timed: boolean) => void;
  onMinutesChange: (minutes: TimeMinutes) => void;
  compact?: boolean;
}

export function TimeControlPicker({
  isTimed,
  minutes,
  onTimedChange,
  onMinutesChange,
  compact = false,
}: TimeControlPickerProps) {
  const { t } = useTranslation();

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
        <div className="grid grid-cols-3 gap-2">
          {TIME_MINUTES_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMinutesChange(m)}
              className={clsx(
                "py-2 rounded-lg border text-sm font-mono transition-all",
                minutes === m
                  ? "border-africhess-green bg-africhess-green/15"
                  : "border-white/15 hover:border-white/25"
              )}
            >
              {t("time.minutes", { n: m })}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs opacity-55">
        {isTimed
          ? t("time.hint.timed", { minutes: minutes || DEFAULT_TIME_MINUTES })
          : t("time.hint.unlimited")}
      </p>
    </div>
  );
}
