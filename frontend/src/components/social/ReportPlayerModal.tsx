"use client";

import { useState } from "react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";

interface ReportPlayerModalProps {
  username: string;
  gameId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = ["harassment", "cheating", "spam", "other"] as const;

export function ReportPlayerModal({ username, gameId, onClose, onSuccess }: ReportPlayerModalProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("harassment");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await socialApi.reportPlayer({
        username,
        category,
        description,
        game_id: gameId,
      });
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(formatApiError(err, t("report.error")));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-layer-modal flex items-center justify-center p-4 bg-black/60" role="dialog">
      <div className="glass-card w-full max-w-md p-5 space-y-4">
        <h2 className="font-semibold text-lg">{t("report.title")}</h2>
        <p className="text-sm opacity-70">{username}</p>
        {done ? (
          <p className="text-sm text-africhess-green">{t("report.sent")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    category === c ? "border-africhess-gold text-africhess-gold" : "border-white/20"
                  }`}
                >
                  {t(`report.category.${c}`)}
                </button>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("report.placeholder")}
              className="w-full h-24 text-sm p-2 rounded-lg border border-white/15 bg-transparent resize-none"
              maxLength={2000}
            />
            {error && <p className="text-xs text-africhess-terracotta">{error}</p>}
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/20">
            {done ? t("common.close") : t("common.cancel")}
          </button>
          {!done && (
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="px-4 py-2 text-sm rounded-lg african-gradient text-white disabled:opacity-50"
            >
              {t("report.submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
