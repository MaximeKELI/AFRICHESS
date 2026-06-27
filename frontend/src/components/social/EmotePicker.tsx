"use client";

import { CHESS_EMOTES } from "@/lib/chessEmotes";
import { useTranslation } from "@/hooks/useTranslation";

interface EmotePickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

/** Sélecteur d'emotes échecs pour le chat en partie */
export function EmotePicker({ onSelect, disabled }: EmotePickerProps) {
  const { locale } = useTranslation();

  return (
    <div
      className="flex flex-wrap gap-1 px-2 py-1 border-t border-white/10"
      role="toolbar"
      aria-label={locale === "fr" ? "Emotes" : "Emotes"}
    >
      {CHESS_EMOTES.map((e) => (
        <button
          key={e.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(e.emoji)}
          className="text-lg p-1 rounded hover:bg-white/10 disabled:opacity-40 transition-colors"
          title={locale === "fr" ? e.labelFr : e.labelEn}
          aria-label={locale === "fr" ? e.labelFr : e.labelEn}
        >
          {e.emoji}
        </button>
      ))}
    </div>
  );
}
