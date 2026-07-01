/** Géométrie de la flèche d'indice puzzle (style Chess.com). */

export interface FileRank {
  f: number;
  r: number;
}

export function squareToFileRank(sq: string): FileRank {
  return { f: sq.charCodeAt(0) - 97, r: parseInt(sq[1], 10) - 1 };
}

/**
 * Points intermédiaires du tracé selon le type de pièce :
 * - tour : ligne droite (orthogonal)
 * - fou : diagonale
 * - cavalier : chemin en L (2 segments orthogonaux)
 * - dame / roi / pion : segment direct vers la case cible
 */
export function hintArrowWaypoints(
  from: string,
  to: string,
  pieceType: string
): FileRank[] {
  const a = squareToFileRank(from);
  const b = squareToFileRank(to);
  const df = b.f - a.f;
  const dr = b.r - a.r;

  switch (pieceType) {
    case "n": {
      if (Math.abs(df) === 2) {
        return [a, { f: a.f + df, r: a.r }, b];
      }
      if (Math.abs(dr) === 2) {
        return [a, { f: a.f, r: a.r + dr }, b];
      }
      return [a, b];
    }
    case "r":
      return [a, b];
    case "b":
      return [a, b];
    case "q": {
      const orth = df === 0 || dr === 0;
      const diag = Math.abs(df) === Math.abs(dr);
      if (orth || diag) return [a, b];
      return [a, b];
    }
    default:
      return [a, b];
  }
}

/** Coordonnées % (0–100) sur le plateau, compatible orientation. */
export function toBoardPercent(
  p: FileRank,
  orientation: "white" | "black"
): { x: number; y: number } {
  let f = p.f;
  let r = p.r;
  if (orientation === "black") {
    f = 7 - f;
    r = 7 - r;
  }
  const y = 7 - r;
  return {
    x: ((f + 0.5) / 8) * 100,
    y: ((y + 0.5) / 8) * 100,
  };
}

export function buildHintArrowPathD(
  waypoints: FileRank[],
  orientation: "white" | "black"
): string {
  if (waypoints.length < 2) return "";
  const pts = waypoints.map((p) => toBoardPercent(p, orientation));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}
