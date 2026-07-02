"use client";

import { useCallback, useEffect, useState } from "react";
import { Chess } from "chess.js";
import { gamesApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import type { VoteTallyPayload } from "@/hooks/useGameWebSocket";

interface VoteChessPanelProps {
  gameId: string;
  fen: string;
  canApply: boolean;
  refreshToken?: number;
  wsVote?: VoteTallyPayload | null;
  onApplied: () => void;
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen === "start" ? undefined : fen);
    const move = chess.move(uci);
    return move?.san ?? uci;
  } catch {
    return uci;
  }
}

export function VoteChessPanel({
  gameId,
  fen,
  canApply,
  refreshToken = 0,
  wsVote,
  onApplied,
}: VoteChessPanelProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<VoteTallyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    gamesApi
      .getVoteStatus(gameId)
      .then(({ data }) => setData(data as VoteTallyPayload))
      .catch(() => setData(null));
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  useEffect(() => {
    if (wsVote) setData(wsVote);
  }, [wsVote]);

  const apply = async () => {
    setLoading(true);
    setError(null);
    try {
      await gamesApi.applyVote(gameId);
      onApplied();
      refresh();
    } catch {
      setError(t("vote.applyFailed"));
    } finally {
      setLoading(false);
    }
  };

  const entries = Object.entries(data?.tally ?? {}).sort((a, b) => b[1] - a[1]);
  const labelFor = (uci: string) => data?.tally_san?.[uci] ?? uciToSan(fen, uci);

  return (
    <div className="glass-card p-4 space-y-3 border border-africhess-gold/30">
      <p className="text-sm font-semibold text-africhess-gold">{t("vote.panelTitle")}</p>
      {(data?.club_white || data?.club_black) && (
        <p className="text-xs opacity-60">
          {data.club_white} vs {data.club_black}
        </p>
      )}
      <p className="text-xs opacity-50">
        {t("vote.ply", { n: data?.ply ?? 0 })} · {t("vote.count", { n: data?.votes ?? 0 })}
      </p>
      {data?.my_vote && (
        <p className="text-xs text-africhess-green">
          {t("vote.yourVote")}: <span className="font-mono">{data.my_vote_san ?? labelFor(data.my_vote)}</span>
        </p>
      )}
      {entries.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {entries.map(([uci, n]) => (
            <li key={uci} className="flex justify-between gap-2">
              <span className="font-mono">{labelFor(uci)}</span>
              <span className="text-africhess-gold shrink-0">{n}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs opacity-50">{t("vote.noVotes")}</p>
      )}
      {canApply ? (
        <button
          type="button"
          onClick={apply}
          disabled={loading || entries.length === 0}
          className="w-full py-2 text-sm african-gradient text-white rounded-lg disabled:opacity-40"
        >
          {t("vote.apply")}
        </button>
      ) : (
        <p className="text-xs opacity-50">{t("vote.waitRep")}</p>
      )}
      {error && <p className="text-xs text-africhess-terracotta">{error}</p>}
      <p className="text-xs opacity-40">{t("vote.hint")}</p>
    </div>
  );
}
