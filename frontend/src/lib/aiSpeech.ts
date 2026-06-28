/**
 * Synthèse vocale des commentaires IA.
 * 1) Web Speech API (navigateur)
 * 2) Secours serveur espeak-ng (Linux sans voix système)
 */

import Cookies from "js-cookie";

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let voicesListenerAttached = false;
let keepAliveId: ReturnType<typeof setInterval> | null = null;
let backendTtsOk: boolean | null = null;

type QueuedUtterance = { text: string; byAi: boolean };

const queue: QueuedUtterance[] = [];
let draining = false;
let lastQueuedText = "";
let currentAudio: HTMLAudioElement | null = null;

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8003/api";
}

function authHeaders(): HeadersInit {
  const token = Cookies.get("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const fr = voices.filter(
    (v) => v.lang.startsWith("fr") || v.lang.includes("FR")
  );
  return (
    fr.find((v) => /google|espeak|french|france/i.test(v.name)) ??
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

function isLinuxDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent);
}

function shouldPreferBackendTts(): boolean {
  if (backendTtsOk === true) return true;
  if (typeof window === "undefined" || !window.speechSynthesis) return true;
  refreshVoices();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return true;
  if (isLinuxDesktop() && !preferredVoice) return true;
  return false;
}

function startKeepAlive() {
  if (keepAliveId != null) return;
  keepAliveId = window.setInterval(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking && synth.paused) synth.resume();
  }, 400);
}

function stopKeepAlive() {
  if (keepAliveId != null) {
    window.clearInterval(keepAliveId);
    keepAliveId = null;
  }
}

export function initAiSpeech() {
  attachVoicesListener();
  refreshVoices();
  [120, 500, 1200, 2500].forEach((ms) => window.setTimeout(refreshVoices, ms));
}

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
  if (typeof window !== "undefined" && window.speechSynthesis) {
    queue.length = 0;
    draining = false;
    stopKeepAlive();
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function isAiSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window || Boolean(process.env.NEXT_PUBLIC_API_URL);
}

async function speakViaBackend(text: string): Promise<boolean> {
  try {
    const url = `${apiBase()}/games/tts/?text=${encodeURIComponent(text.slice(0, 500))}`;
    const res = await fetch(url, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) {
      backendTtsOk = false;
      return false;
    }
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return false;
    backendTtsOk = true;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    const blob = new Blob([buf], { type: "audio/wav" });
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    currentAudio = audio;
    audio.volume = 1;
    await audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(objectUrl);
      if (currentAudio === audio) currentAudio = null;
    };
    return true;
  } catch {
    backendTtsOk = false;
    return false;
  }
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
  if (preferredVoice) utterance.voice = preferredVoice;

  utterance.onstart = () => startKeepAlive();
  utterance.onend = () => {
    draining = false;
    if (queue.length === 0) stopKeepAlive();
    window.setTimeout(drainQueue, 60);
  };
  utterance.onerror = () => {
    draining = false;
    void speakViaBackend(item.text).then((ok) => {
      if (!ok) window.setTimeout(drainQueue, 60);
    });
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
  if (typeof window === "undefined") return;

  const normalized = text.trim();
  if (normalized === lastQueuedText && (draining || queue.length > 0)) return;
  lastQueuedText = normalized;

  const prefix = byAi ? "" : "Conseil. ";
  const fullText = `${prefix}${normalized}`;

  if (shouldPreferBackendTts()) {
    void speakViaBackend(fullText).then((ok) => {
      if (!ok && isAiSpeechSupported()) {
        initAiSpeech();
        queue.push({ text: normalized, byAi });
        drainQueue();
      }
    });
    return;
  }

  if (!isAiSpeechSupported()) {
    void speakViaBackend(fullText);
    return;
  }

  initAiSpeech();
  queue.push({ text: normalized, byAi });

  if (!voicesReady) {
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        refreshVoices();
        if (shouldPreferBackendTts()) {
          queue.pop();
          void speakViaBackend(fullText);
        } else {
          drainQueue();
        }
      },
      { once: true }
    );
    window.setTimeout(() => {
      refreshVoices();
      if (shouldPreferBackendTts()) {
        queue.pop();
        void speakViaBackend(fullText);
      } else {
        drainQueue();
      }
    }, 250);
    return;
  }

  drainQueue();
}

/** Test vocal — retourne true si au moins une méthode fonctionne. */
export async function testAiSpeech(phrase: string): Promise<boolean> {
  unlockAiSpeech();
  if (shouldPreferBackendTts()) {
    return speakViaBackend(phrase);
  }
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      void speakViaBackend(phrase).then(resolve);
      return;
    }
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = "fr-FR";
    if (preferredVoice) u.voice = preferredVoice;
    u.onstart = () => resolve(true);
    u.onerror = () => {
      void speakViaBackend(phrase).then(resolve);
    };
    window.speechSynthesis.speak(u);
    window.setTimeout(() => resolve(false), 3000);
  });
}

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
