/** Affichage ELO style Chess.com (provisoire avec « ? »). */

export const PROVISIONAL_GAMES_REQUIRED = 5;

export interface RatingRow {
  mode: string;
  elo: number;
  peak_elo?: number;
  games_count?: number;
  is_provisional?: boolean;
  games_until_established?: number;
  is_established?: boolean;
}

export function formatElo(
  elo: number | null | undefined,
  provisional = false
): string {
  if (elo == null) return "—";
  return provisional ? `${elo}?` : String(elo);
}

export function formatEloParen(
  elo: number | null | undefined,
  provisional = false
): string {
  if (elo == null) return "";
  return `(${formatElo(elo, provisional)})`;
}

export function ratingForMode(
  ratings: RatingRow[],
  mode: string
): RatingRow | undefined {
  return ratings.find((r) => r.mode === mode);
}

export function isProvisionalRating(r: RatingRow | undefined): boolean {
  if (!r) return true;
  if (r.is_provisional != null) return r.is_provisional;
  return (r.games_count ?? 0) < PROVISIONAL_GAMES_REQUIRED;
}
