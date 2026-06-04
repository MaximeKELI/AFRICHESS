/**
 * Synthèse vocale des commentaires IA (Web Speech API, français).
 */

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const fr = voices.filter(
    (v) => v.lang.startsWith("fr") || v.lang.includes("FR")
  );
  return (
    fr.find((v) => v.name.includes("Google") && v.lang.startsWith("fr")) ??
    fr.find((v) => v.localService) ??
    fr[0] ??
    voices.find((v) => v.lang.startsWith("fr")) ??
    null
  );
}

function refreshVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    preferredVoice = pickFrenchVoice(voices);
    voicesReady = true;
  }
}

/** À appeler après un clic utilisateur (politique navigateur). */
export function initAiSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

export function stopAiSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isAiSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakComment(
  text: string,
  options: { byAi?: boolean; enabled?: boolean } = {}
) {
  const { byAi = true, enabled = true } = options;
  if (!enabled || !text.trim()) return;
  if (!isAiSpeechSupported()) return;

  if (!voicesReady) {
    refreshVoices();
    initAiSpeech();
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const prefix = byAi ? "" : "Conseil. ";
  const utterance = new SpeechSynthesisUtterance(`${prefix}${text.trim()}`);
  utterance.lang = "fr-FR";
  utterance.rate = byAi ? 0.92 : 1.0;
  utterance.pitch = byAi ? 0.85 : 1.05;
  utterance.volume = 0.9;

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  synth.speak(utterance);
}
