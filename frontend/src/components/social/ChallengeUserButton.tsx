"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gamesApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { TimeControlPicker } from "@/components/chess/TimeControlPicker";
import {
  defaultPresetForMode,
  playModeFromPreset,
  type TimePresetId,
} from "@/lib/timeControl";

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
  const [isTimed, setIsTimed] = useState(true);
  const [timePreset, setTimePreset] = useState<TimePresetId>(() =>
    defaultPresetForMode("blitz")
  );
  const [isRated, setIsRated] = useState(false);

  useEffect(() => {
    setTimePreset(defaultPresetForMode(mode));
  }, [mode]);

  const challenge = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const playMode = isTimed ? playModeFromPreset(timePreset) : mode;
      const { data } = await gamesApi.challengeUser(username, {
        mode: playMode,
        is_rated: isRated,
        is_timed: isTimed,
        time_control: isTimed ? timePreset : undefined,
      });
      router.push(`/play?game=${data.id}&mode=${playMode}`);
    } catch (err) {
      setError(formatApiError(err, t("friends.challenge.failed")));
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <select
          value={timePreset}
          onChange={(e) => setTimePreset(e.target.value as TimePresetId)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs border rounded-lg px-1.5 py-1 bg-transparent max-w-[4.5rem]"
          title={t("time.title")}
        >
          <option value="3+2">3+2</option>
          <option value="5+0">5+0</option>
          <option value="10+0">10+0</option>
          <option value="15+10">15+10</option>
          <option value="30+0">30+0</option>
        </select>
        <button
          type="button"
          onClick={challenge}
          disabled={busy}
          className="text-xs px-2.5 py-1 rounded-lg african-gradient text-white shrink-0 disabled:opacity-50"
          title={error || undefined}
        >
          {busy ? "…" : t("friends.challenge")}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-sm border rounded-lg px-2 py-1.5 bg-transparent"
        >
          <option value="bullet">Bullet</option>
          <option value="blitz">Blitz</option>
          <option value="rapid">Rapide</option>
          <option value="classical">Classique</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isRated}
            onChange={(e) => setIsRated(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
          {t("play.rated")}
        </label>
      </div>
      <TimeControlPicker
        isTimed={isTimed}
        preset={timePreset}
        onTimedChange={setIsTimed}
        onPresetChange={setTimePreset}
        compact
      />
      <button
        type="button"
        onClick={challenge}
        disabled={busy}
        className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
      >
        {busy ? t("common.loading") : t("friends.challenge")}
      </button>
      {error && <p className="text-xs text-africhess-terracotta">{error}</p>}
    </div>
  );
}
