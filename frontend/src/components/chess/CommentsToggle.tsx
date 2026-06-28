"use client";

import { usePreferencesStore } from "@/store/preferences";
import { useTranslation } from "@/hooks/useTranslation";

export function CommentsToggle({ compact = false }: { compact?: boolean }) {
  const { aiCommentsEnabled, setAiCommentsEnabled } = usePreferencesStore();
  const { t } = useTranslation();

  if (compact) {
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
        <input
          type="checkbox"
          checked={aiCommentsEnabled}
          onChange={(e) => setAiCommentsEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-white/30 text-africhess-gold focus:ring-africhess-gold"
        />
        <span className="text-xs font-medium">{t("comments.toggle")}</span>
      </label>
    );
  }

  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={aiCommentsEnabled}
        onChange={(e) => setAiCommentsEnabled(e.target.checked)}
        className="w-4 h-4 rounded border-white/30 text-africhess-gold focus:ring-africhess-gold"
      />
      <span className="text-sm">
        <span className="font-medium">{t("comments.toggle")}</span>
        <span className="block text-xs opacity-60">{t("comments.toggle.hint")}</span>
      </span>
    </label>
  );
}
