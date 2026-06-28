/**
 * Synthèse vocale — commentaires IA et coach.
 * 1) TTS local Next.js /api/tts (libespeak-ng sur la machine)
 * 2) TTS backend Django /games/tts/
 * 3) Web Speech API (navigateur)
 */

import Cookies from "js-cookie";

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let voicesListenerAttached = false;
let keepAliveId: ReturnType<typeof setInterval> | null = null;
let backendTtsOk: boolean | null = null;
let localTtsOk: boolean | null = null;
let audioUnlocked = false;
let pendingPlay: (() => Promise<boolean>) | null = null;

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
    fr.find((v) => /google|espeak|french|france|mbrola/i.test(v.name)) ??
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
  if (localTtsOk === true || backendTtsOk === true) return true;
  if (localTtsOk === false && backendTtsOk === false) return false;
  if (typeof window === "undefined" || !window.speechSynthesis) return true;
  if (isLinuxDesktop()) return true;
  refreshVoices();
  const voices = window.speechSynthesis.getVoices();
  return voices.length === 0;
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

async function playWavBuffer(buf: ArrayBuffer): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const blob = new Blob([buf], { type: "audio/wav" });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  currentAudio = audio;
  audio.volume = 1;

  const tryPlay = async (): Promise<boolean> => {
    try {
      await audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        if (currentAudio === audio) currentAudio = null;
      };
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        pendingPlay = tryPlay;
        return false;
      }
      URL.revokeObjectURL(objectUrl);
      return false;
    }
  };

  return tryPlay();
}

async function fetchTtsWav(text: string): Promise<ArrayBuffer | null> {
  const encoded = encodeURIComponent(text.slice(0, 500));
  const sources: { url: string; auth: boolean; mark: "local" | "backend" }[] = [];

  if (localTtsOk !== false) {
    sources.push({ url: `/api/tts?text=${encoded}`, auth: false, mark: "local" });
  }
  if (backendTtsOk !== false) {
    sources.push({
      url: `${apiBase()}/games/tts/?text=${encoded}`,
      auth: true,
      mark: "backend",
    });
  }

  for (const { url, auth, mark } of sources) {
    try {
      const res = await fetch(url, {
        credentials: auth ? "include" : "same-origin",
        headers: auth ? authHeaders() : {},
      });
      if (!res.ok) {
        if (mark === "local") localTtsOk = false;
        else backendTtsOk = false;
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) continue;
      if (mark === "local") localTtsOk = true;
      else backendTtsOk = true;
      return buf;
    } catch {
      if (mark === "local") localTtsOk = false;
      else backendTtsOk = false;
    }
  }
  return null;
}

async function speakViaBackend(text: string): Promise<boolean> {
  const buf = await fetchTtsWav(text);
  if (!buf) return false;
  return playWavBuffer(buf);
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
  const prefix = item.byAi ? "" : "";
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

export function initAiSpeech() {
  attachVoicesListener();
  refreshVoices();
  [120, 500, 1200, 2500].forEach((ms) => window.setTimeout(refreshVoices, ms));
}

export function unlockAiSpeech(): boolean {
  if (!isAiSpeechSupported()) return false;
  initAiSpeech();
  audioUnlocked = true;

  if (pendingPlay) {
    const play = pendingPlay;
    pendingPlay = null;
    void play();
  }

  const synth = window.speechSynthesis;
  refreshVoices();
  const warmup = new SpeechSynthesisUtterance(".");
  warmup.volume = 0.01;
  warmup.rate = 3;
  warmup.lang = "fr-FR";
  if (preferredVoice) warmup.voice = preferredVoice;
  synth.speak(warmup);

  void fetchTtsWav(".").then((buf) => {
    if (buf) void playWavBuffer(buf);
  });

  return true;
}

export function isAiSpeechUnlocked(): boolean {
  return audioUnlocked || isAiSpeechSupported();
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

export function speakComment(
  text: string,
  options: { byAi?: boolean; enabled?: boolean; forceUnlock?: boolean } = {}
) {
  const { byAi = true, enabled = true, forceUnlock = false } = options;
  if (!enabled || !text.trim()) return;
  if (typeof window === "undefined") return;

  if (forceUnlock) unlockAiSpeech();

  const normalized = text.trim();
  if (normalized === lastQueuedText && (draining || queue.length > 0)) return;
  lastQueuedText = normalized;

  const speak = async () => {
    if (shouldPreferBackendTts()) {
      const ok = await speakViaBackend(normalized);
      if (ok) return;
    }
    if (!isAiSpeechSupported()) return;
    initAiSpeech();
    queue.push({ text: normalized, byAi });
    drainQueue();
  };

  void speak();
}

export async function testAiSpeech(phrase: string): Promise<boolean> {
  unlockAiSpeech();
  if (await speakViaBackend(phrase)) return true;

  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve(false);
      return;
    }
    refreshVoices();
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = "fr-FR";
    if (preferredVoice) u.voice = preferredVoice;
    u.onstart = () => resolve(true);
    u.onerror = () => resolve(false);
    window.speechSynthesis.speak(u);
    window.setTimeout(() => resolve(false), 4000);
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
