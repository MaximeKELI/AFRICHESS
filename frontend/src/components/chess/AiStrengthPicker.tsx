"use client";

import clsx from "clsx";
import { AI_LEVELS, normalizeToPreset, type AiLevelElo } from "@/lib/aiStrength";

interface AiStrengthPickerProps {
  value: number;
  onChange: (elo: AiLevelElo) => void;
}

export function AiStrengthPicker({ value, onChange }: AiStrengthPickerProps) {
  const selected = normalizeToPreset(value);

  return (
    <div>
      <p className="text-sm font-medium mb-3">Niveau de l&apos;ordinateur</p>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {AI_LEVELS.map((level) => (
          <button
            key={level.elo}
            type="button"
            onClick={() => onChange(level.elo)}
            className={clsx(
              "w-full text-left p-3 rounded-xl border transition-all",
              selected === level.elo
                ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold"
                : "border-white/10 hover:border-white/25 hover:bg-white/5"
            )}
            aria-pressed={selected === level.elo}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="font-semibold text-sm">{level.label}</span>
              <span className="text-xs font-mono text-africhess-gold shrink-0">
                {level.elo} ELO
              </span>
            </div>
            <p className="text-xs opacity-60 mt-0.5">{level.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
