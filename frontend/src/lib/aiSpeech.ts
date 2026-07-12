/**
 * Synthèse vocale — commentaires IA et coach.
 * WAV (/api/tts → /api/games/tts/) en priorité ; speechSynthesis en dernier recours.
 */

import Cookies from "js-cookie";
import { apiBase } from "@/lib/apiConfig";
import { normalizeSpeechText, splitSpeechChunks } from "@/lib/speechText";
import { buildTtsUrls, shouldPreferWavTts } from "@/lib/ttsEndpoints";

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesListenerAttached = false;
let keepAliveId: number | null = null;
let backendTtsOk: boolean | null = null;
let localTtsOk: boolean | null = null;
let localFailStreak = 0;
let backendFailStreak = 0;
let audioUnlocked = false;
let warmupDone = false;
let pendingPlay: (() => Promise<void>) | null = null;

type SpeechJob = { text: string; byAi: boolean; generation: number };
const pendingJobs: SpeechJob[] = [];
let pipelineRunning = false;
let speechGeneration = 0;
let currentAudio: HTMLAudioElement | null = null;
let lastSpeakingText = "";

const MAX_TTS_CHARS = 1200;
const FAIL_STREAK_DISABLE = 3;

/** Clés déjà lues — niveau module pour survivre au Strict Mode remount. */
export const liveSpokenCommentKeys = new Set<string>();
export let liveSpeechPrimed = false;

export function resetLiveSpeechTracking() {
  liveSpokenCommentKeys.clear();
  liveSpeechPrimed = false;
}

export function setLiveSpeechPrimed(value: boolean) {
  liveSpeechPrimed = value;
}

function authHeaders(): HeadersInit {
  const token = Cookies.get("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  return /firefox/i.test(navigator.userAgent);
}

function isRoboticVoice(v: SpeechSynthesisVoice | null): boolean {
  if (!v) return true;
  return /espeak|festival|rhvoice|mbrola/.test(v.name.toLowerCase());
}

function isFrenchVoice(v: SpeechSynthesisVoice): boolean {
  const lang = v.lang.toLowerCase();
  return lang.startsWith("fr") || lang.includes("fr-") || /french|français|francais/.test(v.name.toLowerCase());
}

function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  const isFr = lang.startsWith("fr") || /french|français|francais/.test(n);
  let score = 0;
  if (isFr && !v.localService && /google/.test(n)) score = 120;
  else if (isFr && /neural|natural|premium|wavenet|enhanced/.test(n)) score = 110;
  else if (isFr && /microsoft|azure/.test(n)) score = 90;
  else if (isFr) score = 60;
  else score = 20;
  if (/espeak|festival|rhvoice|mbrola/.test(n)) score = Math.min(score, 8);
  return score;
}

function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const fr = voices.filter(isFrenchVoice);
  const pool = fr.length ? fr : voices;
  return [...pool].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

function refreshVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) preferredVoice = pickFrenchVoice(voices);
}

function attachVoicesListener() {
  if (voicesListenerAttached || typeof window === "undefined" || !window.speechSynthesis) return;
  voicesListenerAttached = true;
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  refreshVoices();
}

function hasHumanBrowserVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  refreshVoices();
  return Boolean(preferredVoice && !isRoboticVoice(preferredVoice));
}

function startKeepAlive() {
  if (keepAliveId != null) return;
  keepAliveId = window.setInterval(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking && synth.paused) synth.resume();
  }, 250);
}

function stopKeepAlive() {
  if (keepAliveId != null) {
    window.clearInterval(keepAliveId);
    keepAliveId = null;
  }
}

function stopCurrentAudio() {
  if (!currentAudio) return;
  const audio = currentAudio;
  const abort = (audio as HTMLAudioElement & { __africhessAbort?: () => void }).__africhessAbort;
  currentAudio = null;
  audio.pause();
  audio.onended = null;
  audio.onerror = null;
  // Résoudre la promesse playWavBufferAndWait — sinon pipelineRunning reste true
  abort?.();
}

function clearStuckSpeechSynthesis() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

function playWavBufferAndWait(buf: ArrayBuffer): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    stopCurrentAudio();
    const blob = new Blob([buf], { type: "audio/wav" });
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl) as HTMLAudioElement & { __africhessAbort?: () => void };
    currentAudio = audio;
    audio.volume = 1;

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      delete audio.__africhessAbort;
      URL.revokeObjectURL(objectUrl);
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    audio.__africhessAbort = () => finish(false);
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);

    void audio.play().then(
      () => undefined,
      (err: unknown) => {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          pendingPlay = () => audio.play().then(() => undefined);
          finish(false);
          return;
        }
        finish(false);
      }
    );
  });
}

/** Exposé pour les tests : URLs réellement appelées. */
export function getTtsFetchUrls(): { local: string; backend: string } {
  return buildTtsUrls(apiBase());
}

async function fetchTtsWav(text: string): Promise<ArrayBuffer | null> {
  const payload = text.slice(0, MAX_TTS_CHARS);
  const urls = buildTtsUrls(apiBase());
  const sources: { url: string; auth: boolean; mark: "local" | "backend" }[] = [];

  if (localTtsOk !== false) {
    sources.push({ url: urls.local, auth: false, mark: "local" });
  }
  if (backendTtsOk !== false) {
    sources.push({ url: urls.backend, auth: true, mark: "backend" });
  }

  for (const { url, auth, mark } of sources) {
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: auth ? "include" : "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? authHeaders() : {}),
        },
        body: JSON.stringify({ text: payload }),
      });
      if (!res.ok) {
        if (mark === "local") {
          localFailStreak += 1;
          if (localFailStreak >= FAIL_STREAK_DISABLE) localTtsOk = false;
        } else {
          backendFailStreak += 1;
          if (backendFailStreak >= FAIL_STREAK_DISABLE) backendTtsOk = false;
        }
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) continue;
      if (mark === "local") {
        localTtsOk = true;
        localFailStreak = 0;
      } else {
        backendTtsOk = true;
        backendFailStreak = 0;
      }
      return buf;
    } catch {
      if (mark === "local") {
        localFailStreak += 1;
        if (localFailStreak >= FAIL_STREAK_DISABLE) localTtsOk = false;
      } else {
        backendFailStreak += 1;
        if (backendFailStreak >= FAIL_STREAK_DISABLE) backendTtsOk = false;
      }
    }
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function speakBrowserChunk(text: string, byAi: boolean, generation: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    if (generation !== speechGeneration) {
      resolve(false);
      return;
    }

    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = preferredVoice?.lang?.startsWith("fr") ? preferredVoice.lang : "fr-FR";
    utterance.rate = byAi ? 0.9 : 0.94;
    utterance.pitch = byAi ? 1 : 1.05;
    utterance.volume = 1;
    refreshVoices();
    if (preferredVoice && !isRoboticVoice(preferredVoice)) {
      utterance.voice = preferredVoice;
    }

    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      stopKeepAlive();
      resolve(ok);
    };

    utterance.onstart = () => startKeepAlive();
    utterance.onend = () => done(true);
    utterance.onerror = () => done(false);

    try {
      synth.speak(utterance);
    } catch {
      done(false);
      return;
    }

    window.setTimeout(() => {
      if (synth.paused) synth.resume();
    }, 60);
    window.setTimeout(() => {
      if (!settled && !synth.speaking && !synth.pending) done(false);
    }, 4000);
  });
}

async function speakChunk(text: string, byAi: boolean, generation: number): Promise<boolean> {
  if (generation !== speechGeneration) return false;

  // WAV d'abord (Chromium + Firefox Linux) — speechSynthesis est peu fiable
  if (shouldPreferWavTts()) {
    const buf = await fetchTtsWav(text);
    if (generation !== speechGeneration) return false;
    if (buf) {
      const ok = await playWavBufferAndWait(buf);
      if (ok) return true;
    }
  }

  if (typeof window !== "undefined" && window.speechSynthesis && hasHumanBrowserVoice()) {
    const ok = await speakBrowserChunk(text, byAi, generation);
    if (generation !== speechGeneration) return false;
    if (ok) return true;
  }

  if (!isFirefox() && typeof window !== "undefined" && window.speechSynthesis) {
    return speakBrowserChunk(text, byAi, generation);
  }
  return false;
}

async function runSpeechPipeline(): Promise<void> {
  if (pipelineRunning) return;
  pipelineRunning = true;

  while (pendingJobs.length > 0) {
    const job = pendingJobs.shift()!;
    if (job.generation !== speechGeneration) continue;

    const fullText = normalizeSpeechText(job.text, MAX_TTS_CHARS);
    if (!fullText) continue;

    lastSpeakingText = fullText;
    for (const chunk of splitSpeechChunks(fullText)) {
      if (job.generation !== speechGeneration) break;
      await speakChunk(chunk, job.byAi, job.generation);
      if (job.generation === speechGeneration) await delay(30);
    }
  }

  lastSpeakingText = "";
  pipelineRunning = false;
  if (pendingJobs.length > 0) void runSpeechPipeline();
}

function enqueueSpeech(text: string, byAi: boolean, interrupt: boolean): void {
  if (interrupt) {
    speechGeneration += 1;
    pendingJobs.length = 0;
    stopCurrentAudio();
    clearStuckSpeechSynthesis();
  }
  pendingJobs.push({ text, byAi, generation: speechGeneration });
  // Toujours relancer : un await précédent peut venir de se débloquer
  void runSpeechPipeline();
}

export function initAiSpeech() {
  if (typeof window === "undefined") return;
  attachVoicesListener();
  refreshVoices();
  [50, 200, 500, 1200].forEach((ms) => window.setTimeout(refreshVoices, ms));
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

  if (!warmupDone && typeof window !== "undefined") {
    try {
      const silent = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
      );
      silent.volume = 0.01;
      void silent.play().then(
        () => {
          silent.pause();
          warmupDone = true;
        },
        () => {
          warmupDone = true;
        }
      );
    } catch {
      warmupDone = true;
    }
  }
  return true;
}

export function isAiSpeechUnlocked(): boolean {
  return audioUnlocked;
}

export function stopAiSpeech() {
  speechGeneration += 1;
  pendingJobs.length = 0;
  stopKeepAlive();
  stopCurrentAudio();
  clearStuckSpeechSynthesis();
  lastSpeakingText = "";
  pipelineRunning = false;
}

export function isSpeechActive(): boolean {
  if (pipelineRunning || pendingJobs.length > 0) return true;
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
  return false;
}

export function waitForSpeechIdle(timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (!isSpeechActive() || Date.now() - started > timeoutMs) {
        if (isSpeechActive()) {
          clearStuckSpeechSynthesis();
          pipelineRunning = false;
        }
        resolve();
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

export function isAiSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return true;
}

export function speakComment(
  text: string,
  options: {
    byAi?: boolean;
    enabled?: boolean;
    forceUnlock?: boolean;
    interrupt?: boolean;
  } = {}
): Promise<void> {
  const { byAi = true, enabled = true, forceUnlock = false, interrupt = true } = options;
  if (!enabled || !text.trim() || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (forceUnlock || !audioUnlocked) unlockAiSpeech();

  const normalized = text.trim();
  if (
    !interrupt &&
    normalized === lastSpeakingText &&
    (pipelineRunning || pendingJobs.some((j) => j.text.trim() === normalized))
  ) {
    return waitForSpeechIdle();
  }

  enqueueSpeech(normalized, byAi, interrupt);
  return waitForSpeechIdle();
}

export async function testAiSpeech(phrase: string): Promise<boolean> {
  unlockAiSpeech();
  stopAiSpeech();
  await delay(80);
  enqueueSpeech(phrase, false, false);
  await waitForSpeechIdle(30_000);
  return true;
}

export function bindAiSpeechToUserGestures(active: boolean) {
  if (typeof window === "undefined" || !active) return () => undefined;

  const onGesture = () => unlockAiSpeech();
  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onGesture, { capture: true, passive: true });
  window.addEventListener("touchstart", onGesture, { capture: true, passive: true });

  return () => {
    window.removeEventListener("pointerdown", onGesture, { capture: true });
    window.removeEventListener("keydown", onGesture, { capture: true });
    window.removeEventListener("touchstart", onGesture, { capture: true });
  };
}

/** Reset module state for unit tests. */
export function __resetAiSpeechForTests() {
  stopAiSpeech();
  localTtsOk = null;
  backendTtsOk = null;
  localFailStreak = 0;
  backendFailStreak = 0;
  audioUnlocked = false;
  warmupDone = false;
  pendingPlay = null;
  resetLiveSpeechTracking();
}
