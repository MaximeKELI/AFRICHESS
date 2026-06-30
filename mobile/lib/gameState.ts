import type { GameData } from "./api";

export interface WsGamePayload {
  game: GameData & { turn?: string };
  last_move?: {
    uci: string;
    san: string;
    played_by_white: boolean;
  };
  game_over?: boolean;
  reason?: string;
}

export function wsPayloadToGameData(payload: WsGamePayload): GameData {
  const { game } = payload;
  return {
    id: game.id,
    fen: game.fen,
    status: game.status,
    result: game.result,
    is_vs_ai: game.is_vs_ai,
    is_rated: game.is_rated,
    move_count: game.move_count,
    draw_offered_by: game.draw_offered_by,
    takeback_requested_by: game.takeback_requested_by,
    ai_target_elo: game.ai_target_elo,
    moves: game.moves,
    variant: game.variant,
    is_timed: game.is_timed,
    white_time_ms: game.white_time_ms,
    black_time_ms: game.black_time_ms,
    increment_ms: game.increment_ms,
    bot: game.bot,
    white_player: game.white_player,
    black_player: game.black_player,
  };
}
