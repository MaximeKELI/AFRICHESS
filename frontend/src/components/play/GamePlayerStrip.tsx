"use client";

import Image from "next/image";
import clsx from "clsx";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { UserFlair } from "@/components/profile/UserFlair";
import { CapturedPieceIcon } from "@/components/chess/CapturedPieceIcon";
import { formatClock } from "@/lib/clock";
import { formatEloParen } from "@/lib/ratings";
import { countryFlag } from "@/lib/worldCountries";
import type { PlayerDisplayInfo } from "@/lib/gamePlayers";
import { usePreferencesStore } from "@/store/preferences";

export interface GamePlayerStripProps {
  player: PlayerDisplayInfo;
  clockMs?: number;
  clockActive?: boolean;
  clockRunning?: boolean;
  clockLabel?: string;
  /** Pièces capturées par ce joueur (affichées sous le nom, style Chess.com). */
  capturedPieces?: string[];
  materialAdvantage?: number;
  outcome?: "win" | "loss" | "draw" | null;
}

export function GamePlayerStrip({
  player,
  clockMs,
  clockActive = false,
  clockRunning = false,
  clockLabel,
  capturedPieces = [],
  materialAdvantage,
  outcome = null,
}: GamePlayerStripProps) {
  const pieceSet = usePreferencesStore((s) => s.pieceSet);
  const lowTime = clockMs != null && clockMs < 10_000 && clockRunning && clockActive;
  const showClock = clockMs != null;
  const hasCaptures = capturedPieces.length > 0 || (materialAdvantage != null && materialAdvantage > 0);

  return (
    <div className="w-full min-w-0">
      {clockLabel && (
        <p className="text-center text-[10px] opacity-50 mb-0.5 px-1">{clockLabel}</p>
      )}
      <div
        className={clsx(
          "game-player-strip flex items-center gap-2 sm:gap-2.5 w-full min-w-0 px-2 sm:px-2.5 py-1.5 transition-colors",
          clockActive && clockRunning
            ? "bg-africhess-gold/20 ring-1 ring-inset ring-africhess-gold/70"
            : "bg-black/40"
        )}
      >
        <span className="text-lg sm:text-xl leading-none shrink-0" aria-hidden>
          {countryFlag(player.country ?? "")}
        </span>

        {player.kind === "user" ? (
          <UserAvatar
            avatar={player.avatar}
            avatarPreset={player.avatarPreset}
            displayName={player.name}
            username={player.username ?? player.name}
            size={32}
            className="shrink-0 !w-8 !h-8 sm:!w-9 sm:!h-9"
          />
        ) : (
          <span className="relative rounded-md overflow-hidden ring-1 ring-africhess-terracotta/40 shrink-0 w-8 h-8 sm:w-9 sm:h-9">
            <Image
              src={player.aiAvatarSrc!}
              alt={player.name}
              fill
              className="object-cover"
              sizes="36px"
            />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight inline-flex items-center gap-1 max-w-full">
            {player.title && (
              <span className="text-africhess-gold text-[11px] font-bold shrink-0">{player.title}</span>
            )}
            <UserFlair flair={player.kind === "user" ? player.flair : undefined} />
            <span className="truncate">{player.name}</span>
            {outcome === "win" && (
              <span className="text-emerald-400 text-[12px] shrink-0" title="Gagnant">
                👑
              </span>
            )}
            {outcome === "loss" && (
              <span className="text-rose-400 text-[12px] shrink-0" title="Perdant">
                ☠
              </span>
            )}
            {player.elo != null && (
              <span className="text-[11px] opacity-55 font-mono tabular-nums font-normal shrink-0">
                {formatEloParen(player.elo, player.eloProvisional)}
              </span>
            )}
          </p>
          {hasCaptures && (
            <div className="flex items-center gap-0.5 mt-0.5 min-h-[1.1rem] overflow-hidden">
              {capturedPieces.map((key, i) => (
                <CapturedPieceIcon
                  key={`${key}-${i}`}
                  pieceKey={key}
                  size={18}
                  pieceSet={pieceSet}
                />
              ))}
              {materialAdvantage != null && materialAdvantage > 0 && (
                <span className="text-[11px] font-semibold tabular-nums opacity-65 ml-0.5">
                  +{materialAdvantage}
                </span>
              )}
            </div>
          )}
        </div>

        {showClock && (
          <span
            className={clsx(
              "font-mono text-xl sm:text-2xl font-bold tabular-nums shrink-0 pl-2 min-w-[4.75rem] text-right rounded-md px-1.5 py-0.5",
              clockActive && clockRunning && "bg-black/35",
              lowTime ? "text-africhess-terracotta" : "opacity-95"
            )}
          >
            {formatClock(clockMs)}
          </span>
        )}
      </div>
    </div>
  );
}
