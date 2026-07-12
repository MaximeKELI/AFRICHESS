import { Chess } from "chess.js";
import type { BasicsGoal, BasicsStage } from "./stages";

/** Applique un UCI et retourne si l'objectif du stage est atteint. */
export function evaluateBasicsMove(
  fen: string,
  uci: string,
  goal: BasicsGoal
): { ok: boolean; fen: string; illegal?: boolean; done: boolean } {
  const board = new Chess(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = (uci[4] as "q" | "r" | "b" | "n") || undefined;
  let move;
  try {
    move = board.move({ from, to, promotion: promotion || "q" });
  } catch {
    return { ok: false, fen, illegal: true, done: false };
  }
  if (!move) return { ok: false, fen, illegal: true, done: false };

  const nextFen = board.fen();
  let done = false;

  switch (goal.type) {
    case "dest":
      done = goal.squares.includes(to);
      break;
    case "capture":
      done = Boolean(move.captured);
      break;
    case "check":
      done = board.isCheck();
      break;
    case "mate":
      done = board.isCheckmate();
      break;
    case "castle":
      done = move.flags.includes("k") || move.flags.includes("q");
      break;
    default:
      done = false;
  }

  return { ok: true, fen: nextFen, done };
}

export function orientationFromFen(fen: string): "white" | "black" {
  return fen.includes(" b ") ? "black" : "white";
}

export function stageCompleteLabel(stage: BasicsStage): string {
  return stage.id;
}
