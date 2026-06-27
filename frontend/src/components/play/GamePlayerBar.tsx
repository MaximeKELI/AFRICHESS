"use client";

import Image from "next/image";
import { pickAiAvatar } from "@/lib/avatars";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { UserFlair } from "@/components/profile/UserFlair";
import { useTranslation } from "@/hooks/useTranslation";

interface GamePlayerBarProps {
  user: {
    avatar?: string | null;
    display_name?: string | null;
    username: string;
    flair?: string | null;
  };
  aiElo?: number | null;
  playerIsWhite: boolean;
  /** sandwich-top = adversaire seul, sandwich-bottom = joueur seul */
  side?: "both" | "opponent" | "player";
}

export function GamePlayerBar({ user, aiElo, playerIsWhite, side = "both" }: GamePlayerBarProps) {
  const { t } = useTranslation();
  const ai = pickAiAvatar(aiElo);
  const userLabel = user.display_name || user.username;

  const white = playerIsWhite
    ? { label: userLabel, kind: "user" as const }
    : { label: ai.name, kind: "ai" as const, src: ai.src };
  const black = playerIsWhite
    ? { label: ai.name, kind: "ai" as const, src: ai.src }
    : { label: userLabel, kind: "user" as const };

  const opponent = playerIsWhite ? black : white;
  const player = playerIsWhite ? white : black;

  if (side === "opponent") {
    return (
      <PlayerChip
        label={opponent.label}
        kind={opponent.kind}
        user={opponent.kind === "user" ? user : undefined}
        aiSrc={opponent.kind === "ai" ? opponent.src : undefined}
        align="left"
        roleLabel={opponent.kind === "ai" ? t("play.playerBar.computer") : t("play.playerBar.opponent")}
        compact
      />
    );
  }

  if (side === "player") {
    return (
      <PlayerChip
        label={player.label}
        kind={player.kind}
        user={player.kind === "user" ? user : undefined}
        aiSrc={player.kind === "ai" ? player.src : undefined}
        align="left"
        roleLabel={player.kind === "user" ? t("play.playerBar.you") : t("play.playerBar.computer")}
        compact
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <PlayerChip
        label={white.label}
        kind={white.kind}
        user={white.kind === "user" ? user : undefined}
        aiSrc={white.kind === "ai" ? white.src : undefined}
        align="left"
        roleLabel={white.kind === "ai" ? t("play.playerBar.computer") : t("play.playerBar.you")}
      />
      <span className="text-xs opacity-40 shrink-0">{t("play.playerBar.vs")}</span>
      <PlayerChip
        label={black.label}
        kind={black.kind}
        user={black.kind === "user" ? user : undefined}
        aiSrc={black.kind === "ai" ? black.src : undefined}
        align="right"
        roleLabel={black.kind === "ai" ? t("play.playerBar.computer") : t("play.playerBar.you")}
      />
    </div>
  );
}

function PlayerChip({
  label,
  kind,
  user,
  aiSrc,
  align,
  roleLabel,
  compact = false,
}: {
  label: string;
  kind: "user" | "ai";
  user?: GamePlayerBarProps["user"];
  aiSrc?: string;
  align: "left" | "right";
  roleLabel: string;
  compact?: boolean;
}) {
  const size = compact ? 32 : 36;
  return (
    <div
      className={`flex items-center gap-2 min-w-0 w-full glass-card px-3 py-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {kind === "user" && user ? (
        <UserAvatar
          avatar={user.avatar}
          displayName={user.display_name}
          username={user.username}
          size={size}
        />
      ) : (
        <span className="relative rounded-lg overflow-hidden ring-1 ring-africhess-terracotta/40 shrink-0" style={{ width: size, height: size }}>
          <Image src={aiSrc!} alt={label} fill className="object-cover" sizes={`${size}px`} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate inline-flex items-center gap-1">
          <UserFlair flair={kind === "user" ? user?.flair : undefined} />
          {label}
        </p>
        <p className="text-[10px] opacity-50">{roleLabel}</p>
      </div>
    </div>
  );
}
