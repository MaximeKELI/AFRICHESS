import type { StatsExportData } from "@/lib/statsExport";

export interface StatsPdfLabels {
  brand: string;
  coverSubtitle: string;
  coverTagline: string;
  generatedFor: string;
  generatedAt: string;
  page: string;
  of: string;
  confidential: string;
  sectionSummary: string;
  sectionOutcomes: string;
  sectionModes: string;
  sectionOpponents: string;
  sectionRatings: string;
  sectionEloHistory: string;
  sectionRecentGames: string;
  sectionOpenings: string;
  sectionActivity: string;
  games: string;
  wins: string;
  winRate: string;
  streak: string;
  playTime: string;
  puzzles: string;
  vsAi: string;
  victories: string;
  draws: string;
  losses: string;
  mode: string;
  played: string;
  won: string;
  drawn: string;
  lost: string;
  winPct: string;
  online: string;
  ai: string;
  white: string;
  black: string;
  opponent: string;
  opening: string;
  result: string;
  date: string;
  moves: string;
  elo: string;
  peak: string;
  before: string;
  after: string;
  change: string;
  termination: string;
  noData: string;
  outcomeWin: string;
  outcomeLoss: string;
  outcomeDraw: string;
}

export interface StatsPdfDocumentProps {
  data: StatsExportData;
  username: string;
  displayName: string;
  labels: StatsPdfLabels;
  exportedAt: Date;
  terminationMap: Record<string, string>;
  locale: string;
}

export type { StatsExportData };
