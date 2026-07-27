import { Chess, type Square } from "chess.js";

export function parseUci(uci: string): {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
} | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion =
    uci.length > 4 ? (uci[4].toLowerCase() as "q" | "r" | "b" | "n") : undefined;
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null;
  return { from, to, promotion };
}

/** Cases cibles d'un prémove (tour forcé sur la couleur du joueur). */
export function premoveDestinations(
  fen: string,
  from: Square,
  playerColor: "w" | "b"
): Square[] {
  try {
    const normalized =
      fen === "start"
        ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        : fen.replace(/\[.*?\]/g, "").trim();
    const parts = normalized.split(/\s+/);
    if (parts.length < 2) return [];
    parts[1] = playerColor;
    const probe = new Chess(parts.join(" "));
    const piece = probe.get(from);
    if (!piece || piece.color !== playerColor) return [];
    return probe.moves({ square: from, verbose: true }).map((m) => m.to as Square);
  } catch {
    return [];
  }
}

/** Le UCI est-il légal dans la position donnée ? */
export function isUciLegalInFen(fen: string, uci: string): boolean {
  const parsed = parseUci(uci);
  if (!parsed) return false;
  try {
    const chess = new Chess(
      fen === "start" ? undefined : fen.replace(/\[.*?\]/g, "").trim()
    );
    const move = chess.move({
      from: parsed.from,
      to: parsed.to,
      promotion: parsed.promotion,
    });
    return Boolean(move);
  } catch {
    return false;
  }
}
