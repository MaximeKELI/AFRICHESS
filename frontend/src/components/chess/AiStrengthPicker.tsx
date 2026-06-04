"use client";

import clsx from "clsx";
import {
  AI_ELO_PRESETS,
  AI_ELO_STEP,
  MAX_AI_ELO,
  MIN_AI_ELO,
  clampAiElo,
  eloStrengthLabel,
} from "@/lib/aiStrength";

interface AiStrengthPickerProps {
  value: number;
  onChange: (elo: number) => void;
}

export function AiStrengthPicker({ value, onChange }: AiStrengthPickerProps) {
  const elo = clampAiElo(value);
  const label = eloStrengthLabel(elo);
  const isMonster = elo >= 4500;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline gap-2">
        <label className="text-sm font-medium">Force de l&apos;IA</label>
        <span className="font-mono font-bold text-africhess-gold text-lg">{elo}</span>
      </div>
      <p className="text-xs opacity-70 -mt-1">
        {label}
        {isMonster && (
          <span className="text-africhess-terracotta font-semibold">
            {" "}
            — niveau moteur, très difficile à battre
          </span>
        )}
      </p>
      <input
        type="range"
        min={MIN_AI_ELO}
        max={MAX_AI_ELO}
        step={AI_ELO_STEP}
        value={elo}
        onChange={(e) => onChange(clampAiElo(Number(e.target.value)))}
        className="w-full accent-africhess-gold"
        aria-label="ELO de l'IA"
      />
      <div className="flex justify-between text-[10px] opacity-50 font-mono">
        <span>{MIN_AI_ELO}</span>
        <span>{MAX_AI_ELO}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AI_ELO_PRESETS.map((p) => (
          <button
            key={p.elo}
            type="button"
            onClick={() => onChange(p.elo)}
            className={clsx(
              "px-2 py-1 rounded-md text-[10px] font-medium border transition-colors",
              elo === p.elo
                ? "border-africhess-gold bg-africhess-gold/20 text-africhess-gold"
                : "border-white/15 hover:border-white/30 opacity-80"
            )}
          >
            {p.label}
            <span className="font-mono opacity-60 ml-1">{p.elo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
