/** Sélection de voix navigateur — exclut espeak, préfère neural/premium. */

export interface BrowserVoiceLike {
  name: string;
  lang: string;
  localService: boolean;
}

export function isRoboticVoice(v: BrowserVoiceLike | null): boolean {
  if (!v) return true;
  return /espeak|festival|rhvoice|mbrola|pico|svox/.test(v.name.toLowerCase());
}

export function isFrenchVoice(v: BrowserVoiceLike): boolean {
  const lang = v.lang.toLowerCase();
  return lang.startsWith("fr") || lang.includes("fr-") || /french|français|francais/.test(v.name.toLowerCase());
}

export function voiceScore(v: BrowserVoiceLike): number {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  const isFr = lang.startsWith("fr") || /french|français|francais/.test(n);
  let score = 0;
  if (isFr && !v.localService && /google/.test(n)) score = 120;
  else if (isFr && /neural|natural|premium|wavenet|enhanced/.test(n)) score = 110;
  else if (isFr && /microsoft|azure/.test(n)) score = 90;
  else if (isFr && /apple|thomas|amélie|amelie|aurelie|aurélie/.test(n)) score = 85;
  else if (isFr) score = 60;
  else score = 20;
  if (/espeak|festival|rhvoice|mbrola|pico|svox/.test(n)) score = Math.min(score, 8);
  return score;
}

export function pickFrenchVoice(voices: BrowserVoiceLike[]): BrowserVoiceLike | null {
  if (!voices.length) return null;
  const human = voices.filter((v) => !isRoboticVoice(v));
  if (!human.length) return null;
  const fr = human.filter(isFrenchVoice);
  const pool = fr.length ? fr : human;
  return [...pool].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

/** Voix premium = Google remote ou Microsoft neural (score ≥ 90). */
export function isPremiumBrowserVoice(v: BrowserVoiceLike | null): boolean {
  return Boolean(v && !isRoboticVoice(v) && voiceScore(v) >= 90);
}

export const PREMIUM_VOICE_SCORE_THRESHOLD = 90;
