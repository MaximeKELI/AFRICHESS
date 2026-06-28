/**
 * Synthèse vocale des commentaires IA (Web Speech API, français).
 */

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let voicesListenerAttached = false;
let keepAliveId: ReturnType<typeof setInterval> | null = null;

type QueuedUtterance = { text: string; byAi: boolean };

const queue: QueuedUtterance[] = [];
let draining = false;
let lastQueuedText = "";

function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const fr = voices.filter(
    (v) => v.lang.startsWith("fr") || v.lang.includes("FR")
  );
  return (
    fr.find((v) => v.name.includes("Google") && v.lang.startsWith("fr")) ??
    fr.find((v) => v.localService) ??
    fr[0] ??
    voices.find((v) => v.lang.startsWith("fr")) ??
    voices[0] ??
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

function startKeepAlive() {
  if (keepAliveId != null) return;
  keepAliveId = window.setInterval(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking && synth.paused) {
      synth.resume();
    }
  }, 400);
}

function stopKeepAlive() {
  if (keepAliveId != null) {
    window.clearInterval(keepAliveId);
    keepAliveId = null;
  }
}

/** Charge les voix — appeler tôt (montage composant). */
export function initAiSpeech() {
  attachVoicesListener();
  refreshVoices();
  if (!voicesReady) {
    window.setTimeout(refreshVoices, 120);
    window.setTimeout(refreshVoices, 500);
  }
}

/**
 * Débloque la synthèse vocale — appeler sur clic / toucher (geste utilisateur).
 */
export function unlockAiSpeech(): boolean {
  if (!isAiSpeechSupported()) return false;
  initAiSpeech();

  const synth = window.speechSynthesis;
  refreshVoices();

  const warmup = new SpeechSynthesisUtterance(".");
  warmup.volume = 0.01;
  warmup.rate = 3;
  warmup.lang = "fr-FR";
  if (preferredVoice) warmup.voice = preferredVoice;
  synth.speak(warmup);

  return true;
}

export function isAiSpeechUnlocked(): boolean {
  return isAiSpeechSupported();
}

export function stopAiSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  queue.length = 0;
  draining = false;
  stopKeepAlive();
  window.speechSynthesis.cancel();
}

export function isAiSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function drainQueue() {
  if (draining || queue.length === 0 || typeof window === "undefined") return;

  const synth = window.speechSynthesis;
  if (synth.speaking) {
    window.setTimeout(drainQueue, 80);
    return;
  }

  draining = true;
  const item = queue.shift()!;
  const prefix = item.byAi ? "" : "Conseil. ";
  const utterance = new SpeechSynthesisUtterance(`${prefix}${item.text.trim()}`);
  utterance.lang = "fr-FR";
  utterance.rate = item.byAi ? 0.93 : 1.0;
  utterance.pitch = item.byAi ? 0.88 : 1.05;
  utterance.volume = 1;

  refreshVoices();
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => startKeepAlive();
  utterance.onend = () => {
    draining = false;
    if (queue.length === 0) stopKeepAlive();
    window.setTimeout(drainQueue, 60);
  };
  utterance.onerror = () => {
    draining = false;
    window.setTimeout(drainQueue, 60);
  };

  synth.speak(utterance);
  window.setTimeout(() => {
    if (synth.paused) synth.resume();
  }, 100);
}

export function speakComment(
  text: string,
  options: { byAi?: boolean; enabled?: boolean; forceUnlock?: boolean } = {}
) {
  const { byAi = true, enabled = true } = options;
  if (!enabled || !text.trim()) return;
  if (!isAiSpeechSupported()) return;

  const normalized = text.trim();
  if (normalized === lastQueuedText && (draining || queue.length > 0)) return;
  lastQueuedText = normalized;

  initAiSpeech();
  queue.push({ text, byAi });

  if (!voicesReady) {
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        refreshVoices();
        drainQueue();
      },
      { once: true }
    );
    window.setTimeout(() => {
      refreshVoices();
      drainQueue();
    }, 200);
    return;
  }

  drainQueue();
}

/** Ré-enclenche le déblocage à chaque interaction pendant une partie IA. */
export function bindAiSpeechToUserGestures(active: boolean) {
  if (typeof window === "undefined" || !active) return () => undefined;

  const onGesture = () => unlockAiSpeech();
  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onGesture, { capture: true, passive: true });

  return () => {
    window.removeEventListener("pointerdown", onGesture, { capture: true });
    window.removeEventListener("keydown", onGesture, { capture: true });
  };
}
