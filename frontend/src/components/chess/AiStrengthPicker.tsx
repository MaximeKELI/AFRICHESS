"use client";

import Image from "next/image";
import clsx from "clsx";
import { AI_LEVELS, normalizeToPreset, type AiLevelElo } from "@/lib/aiStrength";
import { aiAvatarForLevelElo } from "@/lib/avatars";

interface AiStrengthPickerProps {
  value: number;
  onChange: (elo: AiLevelElo) => void;
}

export function AiStrengthPicker({ value, onChange }: AiStrengthPickerProps) {
  const selected = normalizeToPreset(value);
  const selectedAi = aiAvatarForLevelElo(selected);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-africhess-gold shrink-0">
          <Image
            src={selectedAi.src}
            alt={selectedAi.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">Niveau de l&apos;ordinateur</p>
          <p className="text-xs text-africhess-gold truncate">
            {selectedAi.name} · {AI_LEVELS.find((l) => l.elo === selected)?.label}
          </p>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {AI_LEVELS.map((level) => {
          const ai = aiAvatarForLevelElo(level.elo);
          return (
            <button
              key={level.elo}
              type="button"
              onClick={() => onChange(level.elo)}
              className={clsx(
                "w-full text-left p-3 rounded-xl border transition-all flex gap-3 items-start",
                selected === level.elo
                  ? "border-africhess-gold bg-africhess-gold/10 ring-1 ring-africhess-gold"
                  : "border-white/10 hover:border-white/25 hover:bg-white/5"
              )}
              aria-pressed={selected === level.elo}
            >
              <span className="relative w-10 h-10 rounded-lg overflow-hidden ring-1 ring-white/20 shrink-0 mt-0.5">
                <Image
                  src={ai.src}
                  alt={ai.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </span>
              <span className="min-w-0 flex-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-sm">
                    {level.label}
                    <span className="font-normal opacity-60 ml-1">· {ai.name}</span>
                  </span>
                  <span className="text-xs font-mono text-africhess-gold shrink-0">
                    {level.range}
                  </span>
                </div>
                <p className="text-xs opacity-60 mt-0.5">
                  {level.description} · moteur ~{level.elo}
                </p>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
