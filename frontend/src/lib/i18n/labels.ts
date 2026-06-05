import type { MessageParams } from "./types";

export type TranslateFn = (key: string, params?: MessageParams) => string;

const MODE_KEYS: Record<string, string> = {
  bullet: "modes.bullet",
  blitz: "modes.blitz",
  rapid: "modes.rapid",
  classical: "modes.classical",
};

const CHESS_LEVEL_IDS = ["beginner", "intermediate", "advanced", "expert", "master"] as const;
const AI_ELOS = [250, 750, 1250, 1750, 2250, 2750, 3250, 4000] as const;

const TERMINATION_KEYS: Record<string, string> = {
  resignation: "stats.termination.resignation",
  timeout: "stats.termination.timeout",
  draw_agreement: "stats.termination.draw_agreement",
  repetition: "stats.termination.repetition",
  checkmate: "stats.termination.checkmate",
  disconnect: "stats.termination.disconnect",
  other: "stats.termination.other",
};

export function modeLabel(t: TranslateFn, mode: string): string {
  const key = MODE_KEYS[mode.toLowerCase()];
  return key ? t(key) : mode;
}

export function chessLevelLabel(t: TranslateFn, id: string): string {
  const key = `level.${id}.label`;
  const val = t(key);
  return val === key ? id : val;
}

export function chessLevelDesc(t: TranslateFn, id: string): string {
  const key = `level.${id}.desc`;
  const val = t(key);
  return val === key ? "" : val;
}

export function aiLevelLabel(t: TranslateFn, elo: number): string {
  const preset = AI_ELOS.find((e) => e === elo) ?? 1250;
  return t(`aiLevel.${preset}.label`);
}

export function aiLevelDesc(t: TranslateFn, elo: number): string {
  const preset = AI_ELOS.find((e) => e === elo) ?? 1250;
  return t(`aiLevel.${preset}.desc`);
}

export function aiLevelRange(t: TranslateFn, elo: number): string {
  const preset = AI_ELOS.find((e) => e === elo) ?? 1250;
  return t(`aiLevel.${preset}.range`);
}

export function terminationLabel(t: TranslateFn, key: string): string {
  const i18nKey = TERMINATION_KEYS[key];
  return i18nKey ? t(i18nKey) : key;
}

export function boardThemeLabel(t: TranslateFn, themeId: string, fallback: string): string {
  const key = `board.theme.${themeId}`;
  const val = t(key);
  return val === key ? fallback : val;
}

export const LOCALE_DATE: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-EG",
  pt: "pt-PT",
  sw: "sw-KE",
};

export function formatLocaleDate(locale: string, date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const loc = LOCALE_DATE[locale] ?? "fr-FR";
  return new Date(date).toLocaleDateString(loc, opts);
}
