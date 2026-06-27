import type { ApiMove } from "@/lib/chessDisplay";

/** Construit un PGN minimal à partir des coups SAN ou retourne le PGN serveur. */
export function buildPgn(options: {
  pgn?: string;
  moves?: ApiMove[];
  white?: string;
  black?: string;
  result?: string;
  event?: string;
  date?: string;
}): string {
  if (options.pgn?.trim()) {
    return options.pgn.trim();
  }
  const headers = [
    `[Event "${options.event ?? "AFRICHESS Game"}"]`,
    `[Site "AFRICHESS"]`,
    `[Date "${options.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, ".")}"]`,
    `[White "${options.white ?? "?"}"]`,
    `[Black "${options.black ?? "?"}"]`,
    `[Result "${options.result ?? "*"}"]`,
  ].join("\n");

  const sans = options.moves?.map((m) => m.san) ?? [];
  if (sans.length === 0) {
    return `${headers}\n\n*`;
  }

  const body: string[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const white = sans[i];
    const black = sans[i + 1];
    body.push(black ? `${moveNum}. ${white} ${black}` : `${moveNum}. ${white}`);
  }
  const result = options.result ?? "*";
  return `${headers}\n\n${body.join(" ")} ${result}`;
}

/** Télécharge un fichier .pgn côté client. */
export function downloadPgn(pgn: string, filename = "partie.pgn"): void {
  const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
