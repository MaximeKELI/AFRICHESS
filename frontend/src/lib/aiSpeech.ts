/**
 * Synthèse vocale — commentaires IA et coach.
 * 1) Web Speech API si voix FR naturelle disponible
 * 2) TTS local Next.js /api/tts (espeak-ng)
 * 3) TTS backend Django /games/tts/
 */

import Cookies from "js-cookie";
import { apiBase } from "@/lib/apiConfig";
import { normalizeSpeechText, splitSpeechChunks } from "@/lib/speechText";

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesListenerAttached = false;
let keepAliveId: ReturnType<typeof setInterval> | null = null;
let backendTtsOk: boolean | null = null;
let localTtsOk: boolean | null = null;
let audioUnlocked = false;
let pendingPlay: (() => Promise<boolean>) | null = null;

type SpeechJob = { text: string; byAi: boolean; generation: number };
const pendingJobs: SpeechJob[] = [];
let pipelineRunning = false;
let speechGeneration = 0;
let currentAudio: HTMLAudioElement | null = null;
let lastSpeakingText = "";

const MAX_TTS_CHARS = 1200;

function authHeaders(): HeadersInit {
  const token = Cookies.get("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  if (/neural|natural|premium|wavenet/.test(n)) return 100;
  if (/google/.test(n)) return 90;
  if (/microsoft|azure/.test(n)) return 85;
  if (/apple|siri/.test(n)) return 80;
  if (/mbrola/.test(n)) return 55;
  if (v.localService && !/espeak|festival/.test(n)) return 65;
  if (/espeak|festival/.test(n)) return 5;
  return 40;
}

function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const fr = voices.filter((v) => v.lang.startsWith("fr") || v.lang.includes("FR"));
  if (!fr.length) return voices[0] ?? null;
  return [...fr].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
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
}

function hasNaturalBrowserVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  refreshVoices();
  return window.speechSynthesis.getVoices().some((v) => {
    if (!v.lang.startsWith("fr") && !v.lang.includes("FR")) return false;
    return voiceScore(v) >= 55;
  });
}

function shouldPreferBackendTts(): boolean {
  if (hasNaturalBrowserVoice()) return false;
  if (localTtsOk === true || backendTtsOk === true) return true;
  if (localTtsOk === false && backendTtsOk === false) return false;
  if (typeof window === "undefined" || !window.speechSynthesis) return true;
  refreshVoices();
  return window.speechSynthesis.getVoices().length === 0;
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

function stopCurrentAudio() {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.onended = null;
  currentAudio.onerror = null;
  currentAudio = null;
}

function playWavBufferAndWait(buf: ArrayBuffer): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    stopCurrentAudio();
    const blob = new Blob([buf], { type: "audio/wav" });
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    currentAudio = audio;
    audio.volume = 1;

    const finish = (ok: boolean) => {
      URL.revokeObjectURL(objectUrl);
      if (currentAudio === audio) currentAudio = null;
      resolve(ok);
    };

    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);

    const tryPlay = async () => {
      try {
        await audio.play();
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          pendingPlay = tryPlay;
          finish(false);
          return;
        }
        finish(false);
      }
    };

    void tryPlay();
  });
}

async function fetchTtsWav(text: string): Promise<ArrayBuffer | null> {
  const payload = text.slice(0, MAX_TTS_CHARS);
  const sources: { url: string; auth: boolean; mark: "local" | "backend" }[] = [];

  if (localTtsOk !== false) {
    sources.push({ url: "/api/tts", auth: false, mark: "local" });
  }
  if (backendTtsOk !== false) {
    sources.push({ url: `${apiBase()}/games/tts/`, auth: true, mark: "backend" });
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

function speakBrowserChunk(text: string, byAi: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = byAi ? 0.95 : 1.0;
    utterance.pitch = byAi ? 0.92 : 1.02;
    utterance.volume = 1;
    refreshVoices();
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => startKeepAlive();
    utterance.onend = () => {
      stopKeepAlive();
      resolve(true);
    };
    utterance.onerror = () => {
      stopKeepAlive();
      resolve(false);
    };

    synth.speak(utterance);
    window.setTimeout(() => {
      if (synth.paused) synth.resume();
    }, 80);
  });
}

async function speakChunk(text: string, byAi: boolean, generation: number): Promise<boolean> {
  if (generation !== speechGeneration) return false;

  if (shouldPreferBackendTts()) {
    const buf = await fetchTtsWav(text);
    if (buf) {
      const ok = await playWavBufferAndWait(buf);
      if (ok) return true;
    }
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    return speakBrowserChunk(text, byAi);
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
    const chunks = splitSpeechChunks(fullText);

    for (const chunk of chunks) {
      if (job.generation !== speechGeneration) break;
      await speakChunk(chunk, job.byAi, job.generation);
    }
  }

  lastSpeakingText = "";
  pipelineRunning = false;
}

function enqueueSpeech(text: string, byAi: boolean, interrupt: boolean): void {
  if (interrupt) {
    speechGeneration += 1;
    pendingJobs.length = 0;
    stopCurrentAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  pendingJobs.push({ text, byAi, generation: speechGeneration });
  void runSpeechPipeline();
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

  return true;
}

export function isAiSpeechUnlocked(): boolean {
  return audioUnlocked || isAiSpeechSupported();
}

export function stopAiSpeech() {
  speechGeneration += 1;
  pendingJobs.length = 0;
  stopKeepAlive();
  stopCurrentAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  lastSpeakingText = "";
  pipelineRunning = false;
}

export function isSpeechActive(): boolean {
  if (pipelineRunning || pendingJobs.length > 0) return true;
  if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
  if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
  return false;
}

/** Attend la fin de la lecture en cours (ou timeout). */
export function waitForSpeechIdle(timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (!isSpeechActive() || Date.now() - started > timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

export function isAiSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window || Boolean(process.env.NEXT_PUBLIC_API_URL);
}

export function speakComment(
  text: string,
  options: {
    byAi?: boolean;
    enabled?: boolean;
    forceUnlock?: boolean;
    /** false = met en file sans couper la lecture en cours */
    interrupt?: boolean;
  } = {}
): Promise<void> {
  const { byAi = true, enabled = true, forceUnlock = false, interrupt = true } = options;
  if (!enabled || !text.trim() || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (forceUnlock) unlockAiSpeech();

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
  enqueueSpeech(phrase, false, true);
  await waitForSpeechIdle(30_000);
  return true;
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
