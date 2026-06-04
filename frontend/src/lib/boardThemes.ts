/** Thèmes de cases pour l'échiquier (couleurs claires / foncées + accents). */

import type { FloralPattern } from "./boardPatterns";

export type BoardThemeId =
  | "wood"
  | "blue"
  | "white"
  | "red"
  | "green"
  | "pink"
  | "purple"
  | "slate"
  | "african"
  | "ocean"
  | "cream"
  | "midnight"
  | "garden-white"
  | "garden-light"
  | "garden-full"
  | "meadow-dark"
  | "sakura"
  | "jungle"
  | "lavender-garden"
  | "mint-bloom";

export interface BoardTheme {
  id: BoardThemeId;
  labelFr: string;
  dark: string;
  light: string;
  /** Sélection, dernier coup (case d'arrivée) */
  accent: string;
  /** Dernier coup (case de départ) */
  accentFrom: string;
  /** Points des coups légaux */
  legal: string;
  /** Anneau de capture */
  capture: string;
  /** Motif floral sur certaines cases */
  floral?: FloralPattern;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "wood",
    labelFr: "Bois",
    dark: "#B58863",
    light: "#F0D9B5",
    accent: "#D4A017",
    accentFrom: "rgba(212, 160, 23, 0.35)",
    legal: "rgba(27, 122, 61, 0.85)",
    capture: "rgba(196, 92, 38, 0.75)",
  },
  {
    id: "blue",
    labelFr: "Bleu",
    dark: "#4A6FA5",
    light: "#D4E4F7",
    accent: "#2563EB",
    accentFrom: "rgba(37, 99, 235, 0.3)",
    legal: "rgba(59, 130, 246, 0.9)",
    capture: "rgba(30, 64, 175, 0.8)",
  },
  {
    id: "white",
    labelFr: "Marbre",
    dark: "#A8A8A8",
    light: "#FFFFFF",
    accent: "#6B7280",
    accentFrom: "rgba(107, 114, 128, 0.35)",
    legal: "rgba(75, 85, 99, 0.85)",
    capture: "rgba(55, 65, 81, 0.75)",
  },
  {
    id: "red",
    labelFr: "Rouge",
    dark: "#8B3A3A",
    light: "#F5D0D0",
    accent: "#DC2626",
    accentFrom: "rgba(220, 38, 38, 0.3)",
    legal: "rgba(185, 28, 28, 0.85)",
    capture: "rgba(127, 29, 29, 0.8)",
  },
  {
    id: "green",
    labelFr: "Vert",
    dark: "#2D6A4F",
    light: "#B7E4C7",
    accent: "#16A34A",
    accentFrom: "rgba(22, 163, 74, 0.35)",
    legal: "rgba(21, 128, 61, 0.9)",
    capture: "rgba(20, 83, 45, 0.8)",
  },
  {
    id: "pink",
    labelFr: "Rose",
    dark: "#B5658D",
    light: "#FCE7F3",
    accent: "#DB2777",
    accentFrom: "rgba(219, 39, 119, 0.3)",
    legal: "rgba(190, 24, 93, 0.85)",
    capture: "rgba(157, 23, 77, 0.75)",
  },
  {
    id: "purple",
    labelFr: "Violet",
    dark: "#5C4B8A",
    light: "#E9E0FF",
    accent: "#7C3AED",
    accentFrom: "rgba(124, 58, 237, 0.35)",
    legal: "rgba(109, 40, 217, 0.85)",
    capture: "rgba(91, 33, 182, 0.8)",
  },
  {
    id: "slate",
    labelFr: "Ardoise",
    dark: "#4A5568",
    light: "#E2E8F0",
    accent: "#475569",
    accentFrom: "rgba(71, 85, 105, 0.35)",
    legal: "rgba(51, 65, 85, 0.85)",
    capture: "rgba(30, 41, 59, 0.75)",
  },
  {
    id: "african",
    labelFr: "Afrique",
    dark: "#1B5E34",
    light: "#F5E6B8",
    accent: "#D4A017",
    accentFrom: "rgba(212, 160, 23, 0.4)",
    legal: "rgba(27, 122, 61, 0.9)",
    capture: "rgba(196, 92, 38, 0.8)",
  },
  {
    id: "ocean",
    labelFr: "Océan",
    dark: "#1E6B7A",
    light: "#A8E6F0",
    accent: "#0891B2",
    accentFrom: "rgba(8, 145, 178, 0.35)",
    legal: "rgba(14, 116, 144, 0.9)",
    capture: "rgba(21, 94, 117, 0.8)",
  },
  {
    id: "cream",
    labelFr: "Crème",
    dark: "#C4A574",
    light: "#FFF8E7",
    accent: "#CA8A04",
    accentFrom: "rgba(202, 138, 4, 0.35)",
    legal: "rgba(161, 98, 7, 0.85)",
    capture: "rgba(133, 77, 14, 0.75)",
  },
  {
    id: "midnight",
    labelFr: "Nuit",
    dark: "#1E293B",
    light: "#64748B",
    accent: "#38BDF8",
    accentFrom: "rgba(56, 189, 248, 0.35)",
    legal: "rgba(56, 189, 248, 0.9)",
    capture: "rgba(14, 165, 233, 0.8)",
  },
  {
    id: "garden-white",
    labelFr: "Jardin ♣",
    dark: "#1B5E34",
    light: "#A7F3D0",
    accent: "#22C55E",
    accentFrom: "rgba(34, 197, 94, 0.35)",
    legal: "rgba(22, 163, 74, 0.9)",
    capture: "rgba(21, 128, 61, 0.8)",
    floral: { onDark: "white", opacity: 0.42 },
  },
  {
    id: "garden-light",
    labelFr: "Prairie ♣",
    dark: "#166534",
    light: "#DCFCE7",
    accent: "#16A34A",
    accentFrom: "rgba(22, 163, 74, 0.3)",
    legal: "rgba(21, 128, 61, 0.85)",
    capture: "rgba(20, 83, 45, 0.75)",
    floral: { onLight: "white", opacity: 0.4 },
  },
  {
    id: "garden-full",
    labelFr: "Verger ♣",
    dark: "#14532D",
    light: "#BBF7D0",
    accent: "#4ADE80",
    accentFrom: "rgba(74, 222, 128, 0.35)",
    legal: "rgba(34, 197, 94, 0.9)",
    capture: "rgba(22, 101, 52, 0.8)",
    floral: { onDark: "white", onLight: "cream", opacity: 0.38 },
  },
  {
    id: "meadow-dark",
    labelFr: "Clairière ♣",
    dark: "#3F6212",
    light: "#ECFCCB",
    accent: "#65A30D",
    accentFrom: "rgba(101, 163, 13, 0.35)",
    legal: "rgba(77, 124, 15, 0.9)",
    capture: "rgba(54, 83, 20, 0.8)",
    floral: { onLight: "black", onDark: "mint", opacity: 0.35 },
  },
  {
    id: "sakura",
    labelFr: "Sakura ♣",
    dark: "#9D174D",
    light: "#FCE7F3",
    accent: "#EC4899",
    accentFrom: "rgba(236, 72, 153, 0.35)",
    legal: "rgba(219, 39, 119, 0.85)",
    capture: "rgba(157, 23, 77, 0.75)",
    floral: { onDark: "white", onLight: "rose", opacity: 0.4 },
  },
  {
    id: "jungle",
    labelFr: "Jungle ♣",
    dark: "#052E16",
    light: "#4ADE80",
    accent: "#FDE047",
    accentFrom: "rgba(253, 224, 71, 0.35)",
    legal: "rgba(74, 222, 128, 0.9)",
    capture: "rgba(34, 197, 94, 0.8)",
    floral: { onDark: "cream", onLight: "white", opacity: 0.36 },
  },
  {
    id: "lavender-garden",
    labelFr: "Lavande ♣",
    dark: "#5B21B6",
    light: "#EDE9FE",
    accent: "#A78BFA",
    accentFrom: "rgba(167, 139, 250, 0.35)",
    legal: "rgba(139, 92, 246, 0.85)",
    capture: "rgba(109, 40, 217, 0.75)",
    floral: { onDark: "white", onLight: "white", opacity: 0.32 },
  },
  {
    id: "mint-bloom",
    labelFr: "Menthe ♣",
    dark: "#0F766E",
    light: "#CCFBF1",
    accent: "#2DD4BF",
    accentFrom: "rgba(45, 212, 191, 0.35)",
    legal: "rgba(20, 184, 166, 0.9)",
    capture: "rgba(15, 118, 110, 0.8)",
    floral: { onDark: "white", onLight: "black", opacity: 0.34 },
  },
];

export function getThemedSquareStyles(theme: BoardTheme) {
  const { buildThemedSquareStyles } = require("./boardPatterns") as typeof import("./boardPatterns");
  return buildThemedSquareStyles(theme.dark, theme.light, theme.floral);
}

export const DEFAULT_BOARD_THEME: BoardThemeId = "wood";

const THEME_MAP = new Map(BOARD_THEMES.map((t) => [t.id, t]));

export function isBoardThemeId(value: string | null): value is BoardThemeId {
  return value !== null && THEME_MAP.has(value as BoardThemeId);
}

export function getBoardTheme(id: BoardThemeId): BoardTheme {
  return THEME_MAP.get(id) ?? THEME_MAP.get(DEFAULT_BOARD_THEME)!;
}

export function accentRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
