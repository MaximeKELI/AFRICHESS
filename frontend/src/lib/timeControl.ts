/** Contrôle du temps partagé (IA + multijoueur). */

export type TimeCategory = "bullet" | "blitz" | "rapid" | "classical";

export type TimePresetId =
  | "1+0"
  | "1+1"
  | "2+1"
  | "3+0"
  | "3+2"
  | "5+0"
  | "5+3"
  | "10+0"
  | "10+5"
  | "15+10"
  | "25+0"
  | "30+0"
  | "30+20"
  | "60+0"
  | "90+30";

export interface TimePresetConfig {
  id: TimePresetId;
  category: TimeCategory;
  baseMs: number;
  incrementMs: number;
  statMinutes: number;
}

export const TIME_PRESETS: Record<TimePresetId, TimePresetConfig> = {
  "1+0": { id: "1+0", category: "bullet", baseMs: 60_000, incrementMs: 0, statMinutes: 1 },
  "1+1": { id: "1+1", category: "bullet", baseMs: 60_000, incrementMs: 1_000, statMinutes: 1 },
  "2+1": { id: "2+1", category: "bullet", baseMs: 120_000, incrementMs: 1_000, statMinutes: 2 },
  "3+0": { id: "3+0", category: "blitz", baseMs: 180_000, incrementMs: 0, statMinutes: 3 },
  "3+2": { id: "3+2", category: "blitz", baseMs: 180_000, incrementMs: 2_000, statMinutes: 3 },
  "5+0": { id: "5+0", category: "blitz", baseMs: 300_000, incrementMs: 0, statMinutes: 5 },
  "5+3": { id: "5+3", category: "blitz", baseMs: 300_000, incrementMs: 3_000, statMinutes: 5 },
  "10+0": { id: "10+0", category: "rapid", baseMs: 600_000, incrementMs: 0, statMinutes: 10 },
  "10+5": { id: "10+5", category: "rapid", baseMs: 600_000, incrementMs: 5_000, statMinutes: 10 },
  "15+10": { id: "15+10", category: "rapid", baseMs: 900_000, incrementMs: 10_000, statMinutes: 15 },
  "25+0": { id: "25+0", category: "rapid", baseMs: 1_500_000, incrementMs: 0, statMinutes: 25 },
  "30+0": { id: "30+0", category: "classical", baseMs: 1_800_000, incrementMs: 0, statMinutes: 30 },
  "30+20": { id: "30+20", category: "classical", baseMs: 1_800_000, incrementMs: 20_000, statMinutes: 30 },
  "60+0": { id: "60+0", category: "classical", baseMs: 3_600_000, incrementMs: 0, statMinutes: 60 },
  "90+30": { id: "90+30", category: "classical", baseMs: 5_400_000, incrementMs: 30_000, statMinutes: 90 },
};

export const TIME_CATEGORIES: { id: TimeCategory; presets: TimePresetId[] }[] = [
  { id: "bullet", presets: ["1+0", "1+1", "2+1"] },
  { id: "blitz", presets: ["3+0", "3+2", "5+0", "5+3"] },
  { id: "rapid", presets: ["10+0", "10+5", "15+10", "25+0"] },
  { id: "classical", presets: ["30+0", "30+20", "60+0", "90+30"] },
];

export const DEFAULT_TIME_PRESET: TimePresetId = "3+2";

/** @deprecated Préférer TIME_PRESETS — conservé pour matchmaking legacy */
export const TIME_MINUTES_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
export type TimeMinutes = (typeof TIME_MINUTES_OPTIONS)[number];
export const DEFAULT_TIME_MINUTES: TimeMinutes = 10;

export function isTimePresetId(value: string): value is TimePresetId {
  return value in TIME_PRESETS;
}

export function defaultPresetForMode(mode: string): TimePresetId {
  switch (mode) {
    case "bullet":
      return "1+0";
    case "blitz":
      return "3+2";
    case "rapid":
      return "10+0";
    case "classical":
      return "30+0";
    default:
      return DEFAULT_TIME_PRESET;
  }
}

/** Cadence envoyée au serveur pour le matchmaking en ligne. */
export function matchmakingTimeControl(
  mode: string,
  isTimed: boolean,
  isRated: boolean,
  preset: TimePresetId
): string | undefined {
  if (!isTimed) return undefined;
  if (isRated) return defaultPresetForMode(mode);
  return preset;
}

export function presetLabel(preset: TimePresetId): string {
  return preset;
}

export function formatTimeControlLabel(
  isTimed: boolean,
  presetOrMinutes?: TimePresetId | number | null
): string {
  if (!isTimed) return "Sans limite";
  if (typeof presetOrMinutes === "string" && isTimePresetId(presetOrMinutes)) {
    return presetLabel(presetOrMinutes);
  }
  if (typeof presetOrMinutes === "number") {
    return `${presetOrMinutes} min`;
  }
  return presetLabel(DEFAULT_TIME_PRESET);
}

export function playModeFromPreset(preset: TimePresetId): "bullet" | "blitz" | "rapid" {
  const category = TIME_PRESETS[preset].category;
  if (category === "classical") return "rapid";
  return category;
}

export function inferPresetFromMs(
  baseMs?: number,
  incrementMs?: number
): TimePresetId | null {
  if (baseMs == null) return null;
  const inc = incrementMs ?? 0;
  for (const preset of Object.values(TIME_PRESETS)) {
    if (preset.baseMs === baseMs && preset.incrementMs === inc) {
      return preset.id;
    }
  }
  return null;
}

export function minutesToPreset(minutes: TimeMinutes): TimePresetId {
  const map: Record<TimeMinutes, TimePresetId> = {
    5: "5+0",
    10: "10+0",
    15: "15+10",
    20: "25+0",
    25: "25+0",
    30: "30+0",
  };
  return map[minutes] ?? DEFAULT_TIME_PRESET;
}
