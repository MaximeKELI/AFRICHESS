"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gamesApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";

interface ChallengeUserButtonProps {
  username: string;
  className?: string;
  compact?: boolean;
}

export function ChallengeUserButton({
  username,
  className = "",
  compact = false,
}: ChallengeUserButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState("blitz");

  const challenge = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await gamesApi.challengeUser(username, { mode, is_rated: true });
      router.push(`/play?game=${data.id}&mode=${mode}`);
    } catch (err) {
      setError(formatApiError(err, t("friends.challenge.failed")));
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={challenge}
        disabled={busy}
        className={`text-xs px-2.5 py-1 rounded-lg african-gradient text-white shrink-0 disabled:opacity-50 ${className}`}
        title={error || undefined}
      >
        {busy ? "…" : t("friends.challenge")}
      </button>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="text-sm border rounded-lg px-2 py-1.5 bg-transparent"
      >
        <option value="bullet">Bullet</option>
        <option value="blitz">Blitz</option>
        <option value="rapid">Rapide</option>
      </select>
      <button
        type="button"
        onClick={challenge}
        disabled={busy}
        className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
      >
        {busy ? t("common.loading") : t("friends.challenge")}
      </button>
      {error && <p className="text-xs text-africhess-terracotta w-full">{error}</p>}
    </div>
  );
}
