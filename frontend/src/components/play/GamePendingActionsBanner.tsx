"use client";

import { useTranslation } from "@/hooks/useTranslation";

interface PlayerRef {
  id: number;
  username: string;
  display_name?: string | null;
}

interface GamePendingActionsBannerProps {
  myUserId?: number;
  drawOfferedBy?: number | null;
  takebackRequestedBy?: number | null;
  whitePlayer?: PlayerRef | null;
  blackPlayer?: PlayerRef | null;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onAcceptTakeback: () => void;
  onDeclineTakeback: () => void;
}

function playerName(
  id: number | null | undefined,
  white?: PlayerRef | null,
  black?: PlayerRef | null
): string {
  if (!id) return "?";
  if (white?.id === id) return white.display_name || white.username;
  if (black?.id === id) return black.display_name || black.username;
  return "?";
}

export function GamePendingActionsBanner({
  myUserId,
  drawOfferedBy,
  takebackRequestedBy,
  whitePlayer,
  blackPlayer,
  onAcceptDraw,
  onDeclineDraw,
  onAcceptTakeback,
  onDeclineTakeback,
}: GamePendingActionsBannerProps) {
  const { t } = useTranslation();

  const opponentDraw =
    drawOfferedBy != null && drawOfferedBy !== myUserId ? drawOfferedBy : null;
  const myDrawWaiting =
    drawOfferedBy != null && drawOfferedBy === myUserId;
  const opponentTakeback =
    takebackRequestedBy != null && takebackRequestedBy !== myUserId
      ? takebackRequestedBy
      : null;
  const myTakebackWaiting =
    takebackRequestedBy != null && takebackRequestedBy === myUserId;

  if (!opponentDraw && !myDrawWaiting && !opponentTakeback && !myTakebackWaiting) {
    return null;
  }

  return (
    <div className="w-full space-y-2 mb-3">
      {opponentDraw != null && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border-2 border-africhess-gold/70 bg-africhess-gold/15 animate-pulse-slow"
          role="alert"
        >
          <p className="text-sm font-medium flex-1">
            {t("play.draw.opponentOffer", {
              name: playerName(opponentDraw, whitePlayer, blackPlayer),
            })}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onAcceptDraw}
              className="text-sm px-4 py-2 rounded-lg bg-africhess-green text-white font-medium"
            >
              {t("play.draw.accept")}
            </button>
            <button
              type="button"
              onClick={onDeclineDraw}
              className="text-sm px-4 py-2 rounded-lg border border-white/30 hover:bg-white/10"
            >
              {t("play.draw.decline")}
            </button>
          </div>
        </div>
      )}
      {myDrawWaiting && (
        <div
          className="p-3 rounded-xl border border-africhess-gold/40 bg-africhess-gold/10 text-sm text-center"
          role="status"
        >
          {t("play.draw.waiting")}
        </div>
      )}
      {opponentTakeback != null && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border-2 border-africhess-green/60 bg-africhess-green/10"
          role="alert"
        >
          <p className="text-sm font-medium flex-1">
            {t("play.takeback.opponentRequest", {
              name: playerName(opponentTakeback, whitePlayer, blackPlayer),
            })}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onAcceptTakeback}
              className="text-sm px-4 py-2 rounded-lg bg-africhess-green text-white font-medium"
            >
              {t("play.takeback.accept")}
            </button>
            <button
              type="button"
              onClick={onDeclineTakeback}
              className="text-sm px-4 py-2 rounded-lg border border-white/30 hover:bg-white/10"
            >
              {t("play.takeback.decline")}
            </button>
          </div>
        </div>
      )}
      {myTakebackWaiting && (
        <div className="p-3 rounded-xl border border-white/20 bg-white/5 text-sm text-center" role="status">
          {t("play.takeback.waiting")}
        </div>
      )}
    </div>
  );
}
