"use client";

import { useEffect, useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";

interface AppealCase {
  id: number;
  game_id?: string;
  verdict?: string;
  status?: string;
}

export function FairPlayAppealPanel() {
  const { t } = useTranslation();
  const [cases, setCases] = useState<AppealCase[]>([]);
  const [reason, setReason] = useState("");
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamesApi
      .fairplayStatus()
      .then(({ data }) => {
        const appeals = data.recent_appeals ?? [];
        const reviewCases = (data.review_cases ?? data.cases ?? []) as AppealCase[];
        setCases(reviewCases);
        if (appeals.length) setStatus(t("fairplay.appeal.pending"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [t]);

  const submit = async () => {
    if (!selectedCase || !reason.trim()) return;
    setError(null);
    try {
      await gamesApi.fairplayAppeal(selectedCase, reason.trim());
      setStatus(t("fairplay.appeal.sent"));
      setReason("");
    } catch (err) {
      setError(formatApiError(err, t("fairplay.appeal.error")));
    }
  };

  if (loading) return null;
  if (!cases.length && !status) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">{t("fairplay.appeal.title")}</h3>
      {status && <p className="text-xs text-africhess-green">{status}</p>}
      {cases.length > 0 && !status?.includes(t("fairplay.appeal.sent")) && (
        <>
          <select
            value={selectedCase ?? ""}
            onChange={(e) => setSelectedCase(Number(e.target.value) || null)}
            className="w-full text-sm p-2 rounded-lg border border-white/15 bg-transparent"
          >
            <option value="">{t("fairplay.appeal.selectCase")}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {t("fairplay.appeal.case")} #{c.id}
              </option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("fairplay.appeal.placeholder")}
            className="w-full h-20 text-sm p-2 rounded-lg border border-white/15 bg-transparent resize-none"
          />
          {error && <p className="text-xs text-africhess-terracotta">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={!selectedCase || !reason.trim()}
            className="text-sm px-4 py-2 rounded-lg african-gradient text-white disabled:opacity-50"
          >
            {t("fairplay.appeal.submit")}
          </button>
        </>
      )}
    </div>
  );
}
