"use client";

import Image from "next/image";
import clsx from "clsx";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { UserFlair } from "@/components/profile/UserFlair";
import { formatClock } from "@/lib/clock";
import { formatEloParen } from "@/lib/ratings";
import { countryFlag } from "@/lib/worldCountries";
import type { PlayerDisplayInfo } from "@/lib/gamePlayers";

export interface GamePlayerStripProps {
  player: PlayerDisplayInfo;
  clockMs?: number;
  clockActive?: boolean;
  clockRunning?: boolean;
  clockLabel?: string;
}

export function GamePlayerStrip({
  player,
  clockMs,
  clockActive = false,
  clockRunning = false,
  clockLabel,
}: GamePlayerStripProps) {
  const lowTime = clockMs != null && clockMs < 10_000 && clockRunning && clockActive;
  const showClock = clockMs != null;

  return (
    <div className="w-full min-w-0">
      {clockLabel && (
        <p className="text-center text-[10px] opacity-50 mb-1">{clockLabel}</p>
      )}
      <div
        className={clsx(
          "game-player-strip flex items-center gap-2 sm:gap-3 w-full min-w-0 px-2.5 sm:px-3 py-2 rounded-xl transition-colors",
          clockActive && clockRunning
            ? "bg-africhess-gold/20 ring-2 ring-africhess-gold/80"
            : "bg-black/30 ring-1 ring-white/10"
        )}
      >
        <span className="text-xl sm:text-2xl leading-none shrink-0" aria-hidden>
          {countryFlag(player.country ?? "")}
        </span>

        {player.kind === "user" ? (
          <UserAvatar
            avatar={player.avatar}
            displayName={player.name}
            username={player.username ?? player.name}
            size={36}
            className="shrink-0 !w-9 !h-9 sm:!w-10 sm:!h-10"
          />
        ) : (
          <span className="relative rounded-lg overflow-hidden ring-1 ring-africhess-terracotta/40 shrink-0 w-9 h-9 sm:w-10 sm:h-10">
            <Image
              src={player.aiAvatarSrc!}
              alt={player.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold truncate leading-tight inline-flex items-center gap-1 max-w-full">
            {player.title && (
              <span className="text-africhess-gold text-xs font-bold shrink-0">{player.title}</span>
            )}
            <UserFlair flair={player.kind === "user" ? player.flair : undefined} />
            <span className="truncate">{player.name}</span>
          </p>
          {player.elo != null && (
            <p className="text-xs opacity-60 font-mono tabular-nums">
              {formatEloParen(player.elo, player.eloProvisional)}
            </p>
          )}
        </div>

        {showClock && (
          <span
            className={clsx(
              "font-mono text-xl sm:text-2xl font-bold tabular-nums shrink-0 pl-1",
              lowTime ? "text-africhess-terracotta" : "text-white/95"
            )}
          >
            {formatClock(clockMs)}
          </span>
        )}
      </div>
    </div>
  );
}
