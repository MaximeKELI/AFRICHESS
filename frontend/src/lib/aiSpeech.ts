/**
 * Synthèse vocale des commentaires IA (Web Speech API, français).
 * Nécessite unlockAiSpeech() après un geste utilisateur (clic).
 */

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let speechUnlocked = false;
let voicesListenerAttached = false;

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

function attachVoicesListener() {
  if (voicesListenerAttached || typeof window === "undefined" || !window.speechSynthesis) return;
  voicesListenerAttached = true;
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

/** Charge les voix — appeler tôt (montage composant). */
export function initAiSpeech() {
  attachVoicesListener();
  refreshVoices();
}

/**
 * Débloque la synthèse vocale — à appeler dans un gestionnaire de clic
 * (politique autoplay des navigateurs).
 */
export function unlockAiSpeech(): boolean {
  if (!isAiSpeechSupported()) return false;
  initAiSpeech();
  speechUnlocked = true;

  const synth = window.speechSynthesis;
  synth.cancel();
  refreshVoices();

  // Chrome / Safari : amorce silencieuse sur geste utilisateur
  const warmup = new SpeechSynthesisUtterance("\u200B");
  warmup.volume = 0.01;
  warmup.rate = 2;
  warmup.lang = "fr-FR";
  if (preferredVoice) warmup.voice = preferredVoice;
  synth.speak(warmup);

  return true;
}

export function isAiSpeechUnlocked(): boolean {
  return speechUnlocked;
}

export function stopAiSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isAiSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function doSpeak(text: string, byAi: boolean) {
  const synth = window.speechSynthesis;
  synth.cancel();

  const prefix = byAi ? "" : "Conseil. ";
  const utterance = new SpeechSynthesisUtterance(`${prefix}${text.trim()}`);
  utterance.lang = "fr-FR";
  utterance.rate = byAi ? 0.92 : 1.0;
  utterance.pitch = byAi ? 0.85 : 1.05;
  utterance.volume = 0.95;

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Contournement bug Chrome : relance si la file reste bloquée
  utterance.onend = () => {
    if (synth.pending && !synth.speaking) {
      synth.resume();
    }
  };

  synth.speak(utterance);

  // Chrome pause parfois la synthèse sans raison
  window.setTimeout(() => {
    if (synth.paused) synth.resume();
  }, 120);
}

export function speakComment(
  text: string,
  options: { byAi?: boolean; enabled?: boolean; forceUnlock?: boolean } = {}
) {
  const { byAi = true, enabled = true, forceUnlock = false } = options;
  if (!enabled || !text.trim()) return;
  if (!isAiSpeechSupported()) return;

  if (forceUnlock) {
    speechUnlocked = true;
  }

  if (!speechUnlocked) {
    return;
  }

  initAiSpeech();

  const speak = () => doSpeak(text, byAi);

  if (!voicesReady || !preferredVoice) {
    refreshVoices();
    if (voicesReady && preferredVoice) {
      speak();
      return;
    }
    const onVoices = () => {
      refreshVoices();
      speak();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices, { once: true });
    window.setTimeout(() => {
      refreshVoices();
      speak();
    }, 250);
    return;
  }

  speak();
}
