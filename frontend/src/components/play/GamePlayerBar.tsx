"use client";

import Image from "next/image";
import { pickAiAvatar } from "@/lib/avatars";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useTranslation } from "@/hooks/useTranslation";

interface GamePlayerBarProps {
  user: {
    avatar?: string | null;
    display_name?: string | null;
    username: string;
  };
  aiElo?: number | null;
  playerIsWhite: boolean;
}

export function GamePlayerBar({ user, aiElo, playerIsWhite }: GamePlayerBarProps) {
  const { t } = useTranslation();
  const ai = pickAiAvatar(aiElo);
  const userLabel = user.display_name || user.username;

  const white = playerIsWhite
    ? { label: userLabel, kind: "user" as const }
    : { label: ai.name, kind: "ai" as const, src: ai.src };
  const black = playerIsWhite
    ? { label: ai.name, kind: "ai" as const, src: ai.src }
    : { label: userLabel, kind: "user" as const };

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
}: {
  label: string;
  kind: "user" | "ai";
  user?: GamePlayerBarProps["user"];
  aiSrc?: string;
  align: "left" | "right";
  roleLabel: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {kind === "user" && user ? (
        <UserAvatar
          avatar={user.avatar}
          displayName={user.display_name}
          username={user.username}
          size={36}
        />
      ) : (
        <span className="relative w-9 h-9 rounded-lg overflow-hidden ring-1 ring-africhess-terracotta/40 shrink-0">
          <Image src={aiSrc!} alt={label} fill className="object-cover" sizes="36px" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-[10px] opacity-50">{roleLabel}</p>
      </div>
    </div>
  );
}
