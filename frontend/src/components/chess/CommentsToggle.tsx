"use client";

import { usePreferencesStore } from "@/store/preferences";

export function CommentsToggle() {
  const { aiCommentsEnabled, setAiCommentsEnabled } = usePreferencesStore();

  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={aiCommentsEnabled}
        onChange={(e) => setAiCommentsEnabled(e.target.checked)}
        className="w-4 h-4 rounded border-white/30 text-africhess-gold focus:ring-africhess-gold"
      />
      <span className="text-sm">
        <span className="font-medium">Commentaires IA</span>
        <span className="block text-xs opacity-60">
          L&apos;ordinateur commente ses coups et vous coach
        </span>
      </span>
    </label>
  );
}
