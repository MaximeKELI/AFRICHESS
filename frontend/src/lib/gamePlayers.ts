import { getAiAvatarSrc, pickAiAvatar } from "@/lib/avatars";

export interface GamePlayerPublic {
  id?: number;
  username: string;
  display_name?: string | null;
  avatar?: string | null;
  avatar_preset?: string | null;
  country?: string | null;
  title?: string | null;
  flair?: string | null;
}

export interface GameBotPublic {
  slug: string;
  name: string;
  country?: string;
  elo: number;
  avatar_id?: string;
}

export interface GamePlayersSource {
  is_vs_ai?: boolean;
  ai_target_elo?: number;
  white_player?: GamePlayerPublic | null;
  black_player?: GamePlayerPublic | null;
  white_elo?: number | null;
  black_elo?: number | null;
  white_elo_provisional?: boolean;
  black_elo_provisional?: boolean;
  bot?: GameBotPublic | null;
}

export interface PlayerDisplayInfo {
  kind: "user" | "ai";
  name: string;
  username?: string;
  elo?: number | null;
  eloProvisional?: boolean;
  country?: string | null;
  title?: string | null;
  flair?: string | null;
  avatar?: string | null;
  avatarPreset?: string | null;
  aiAvatarSrc?: string;
  isYou?: boolean;
}

function sideFromUser(
  player: GamePlayerPublic,
  elo: number | null | undefined,
  currentUserId?: number,
  eloProvisional = false
): PlayerDisplayInfo {
  return {
    kind: "user",
    name: player.display_name?.trim() || player.username,
    username: player.username,
    elo: elo ?? null,
    eloProvisional,
    country: player.country ?? null,
    title: player.title ?? null,
    avatar: player.avatar ?? null,
    avatarPreset: player.avatar_preset ?? null,
    flair: player.flair ?? null,
    isYou: currentUserId != null && player.id === currentUserId,
  };
}

function sideFromAi(game: GamePlayersSource, elo: number | null | undefined): PlayerDisplayInfo {
  const bot = game.bot;
  const resolvedElo = elo ?? game.ai_target_elo ?? null;
  const fallback = pickAiAvatar(resolvedElo);
  return {
    kind: "ai",
    name: bot?.name ?? fallback.name,
    elo: bot?.elo ?? resolvedElo,
    country: bot?.country ?? null,
    aiAvatarSrc: bot?.avatar_id ? getAiAvatarSrc(bot.avatar_id) : fallback.src,
  };
}

export function whitePlayerDisplay(
  game: GamePlayersSource,
  currentUserId?: number,
  fallbackUserElo?: number | null
): PlayerDisplayInfo {
  if (game.white_player) {
    const elo =
      game.white_elo ??
      (game.white_player.id === currentUserId ? fallbackUserElo : null);
    return sideFromUser(
      game.white_player,
      elo,
      currentUserId,
      game.white_elo_provisional ?? false
    );
  }
  return sideFromAi(game, game.white_elo);
}

export function blackPlayerDisplay(
  game: GamePlayersSource,
  currentUserId?: number,
  fallbackUserElo?: number | null
): PlayerDisplayInfo {
  if (game.black_player) {
    const elo =
      game.black_elo ??
      (game.black_player.id === currentUserId ? fallbackUserElo : null);
    return sideFromUser(
      game.black_player,
      elo,
      currentUserId,
      game.black_elo_provisional ?? false
    );
  }
  return sideFromAi(game, game.black_elo);
}

/** Adversaire en haut, joueur local en bas (selon orientation). */
export function opponentAndSelfPlayers(
  game: GamePlayersSource,
  orientation: "white" | "black",
  currentUserId?: number,
  fallbackUserElo?: number | null
): { top: PlayerDisplayInfo; bottom: PlayerDisplayInfo } {
  const white = whitePlayerDisplay(game, currentUserId, fallbackUserElo);
  const black = blackPlayerDisplay(game, currentUserId, fallbackUserElo);
  if (orientation === "white") {
    return { top: black, bottom: white };
  }
  return { top: white, bottom: black };
}
