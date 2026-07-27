/** Thèmes sonores de coups — alignés sur Lichess (`SoundSet`). */

export type SoundThemeId =
  | "silent"
  | "standard"
  | "piano"
  | "nes"
  | "sfx"
  | "futuristic"
  | "lisp"
  | "woodland"
  | "robot"
  | "arena";

export interface SoundTheme {
  id: SoundThemeId;
  /** Clé i18n `sound.theme.<id>` */
  labelKey: string;
  /** Dossier sous /sounds/themes/ (absent pour silent) */
  folder: string | null;
}

export const SOUND_THEMES: SoundTheme[] = [
  { id: "silent", labelKey: "sound.theme.silent", folder: null },
  { id: "standard", labelKey: "sound.theme.standard", folder: "standard" },
  { id: "piano", labelKey: "sound.theme.piano", folder: "piano" },
  { id: "nes", labelKey: "sound.theme.nes", folder: "nes" },
  { id: "sfx", labelKey: "sound.theme.sfx", folder: "sfx" },
  { id: "futuristic", labelKey: "sound.theme.futuristic", folder: "futuristic" },
  { id: "lisp", labelKey: "sound.theme.lisp", folder: "lisp" },
  { id: "woodland", labelKey: "sound.theme.woodland", folder: "woodland" },
  { id: "robot", labelKey: "sound.theme.robot", folder: "robot" },
  /** Mat dramatique original (esprit « fin de partie », pas un asset Chess.com). */
  { id: "arena", labelKey: "sound.theme.arena", folder: "arena" },
];

export const DEFAULT_SOUND_THEME: SoundThemeId = "standard";

const THEME_MAP = new Map(SOUND_THEMES.map((t) => [t.id, t]));

export function isSoundThemeId(value: string | null | undefined): value is SoundThemeId {
  return value != null && THEME_MAP.has(value as SoundThemeId);
}

export function getSoundTheme(id: SoundThemeId): SoundTheme {
  return THEME_MAP.get(id) ?? THEME_MAP.get(DEFAULT_SOUND_THEME)!;
}

export type BoardSoundFile = "move" | "capture" | "castle" | "check" | "checkmate";

/** Chemins MP3/OGG pour un thème fichier (pas silent). */
export function soundFilePaths(
  themeId: SoundThemeId,
  type: BoardSoundFile
): { mp3: string; ogg: string } | null {
  const theme = getSoundTheme(themeId);
  if (!theme.folder) return null;
  const base = `/sounds/themes/${theme.folder}/${type}`;
  return { mp3: `${base}.mp3`, ogg: `${base}.ogg` };
}
