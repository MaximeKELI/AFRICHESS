"use client";

import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";

export type GameVariant = "standard" | "chess960" | "crazyhouse";

interface VariantPickerProps {
  value: GameVariant;
  onChange: (v: GameVariant) => void;
}

const VARIANTS: GameVariant[] = ["standard", "chess960", "crazyhouse"];

export function VariantPicker({ value, onChange }: VariantPickerProps) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm font-medium mb-2">{t("play.variant.title")}</p>
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm border transition-colors",
              value === v
                ? "border-africhess-gold bg-africhess-gold/15 text-africhess-gold"
                : "border-white/15 hover:border-white/30"
            )}
          >
            {t(`play.variant.${v}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
