/**
 * Synthèse vocale — commentaires IA et coach.
 * Navigateur d'abord ; TTS serveur en secours si la voix navigateur échoue.
 */

import Cookies from "js-cookie";
import { apiBase } from "@/lib/apiConfig";
import { normalizeSpeechText, splitSpeechChunks } from "@/lib/speechText";

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesListenerAttached = false;
let keepAliveId: number | null = null;
let backendTtsOk: boolean | null = null;
let localTtsOk: boolean | null = null;
let audioUnlocked = false;
let warmupDone = false;
let pendingPlay: (() => Promise<void>) | null = null;
let speakAfterCancelTimer: number | null = null;

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
  const lang = v.lang.toLowerCase();
  const isFr = lang.startsWith("fr") || /french|français|francais/.test(n);
  let score = 0;

  if (isFr && !v.localService && /google/.test(n)) score = 120;
  else if (isFr && /google français|google french/.test(n)) score = 115;
  else if (isFr && /neural|natural|premium|wavenet|online \(natural\)|enhanced/.test(n)) score = 110;
  else if (isFr && /microsoft.*(hortense|julie|pauline|denise|henri)|azure/.test(n)) score = 100;
  else if (isFr && /thomas|amélie|aurelie|aurélie|marie|virginie|stephanie/.test(n)) score = 95;
  else if (isFr && /apple|siri|éloquence|eloquence|compact/.test(n)) score = 88;
  else if (isFr && /google/.test(n)) score = 85;
  else if (isFr && /microsoft|azure/.test(n)) score = 78;
  else if (isFr && v.localService && !/espeak|festival|rhvoice/.test(n)) score = 72;
  else if (isFr) score = 60;
  else if (!v.localService && /google/.test(n)) score = 40;
  else score = 20;

  if (/espeak|festival|rhvoice|mbrola/.test(n)) score = Math.min(score, 8);
  if (!v.localService) score += 5;
  return score;
}

function isFrenchVoice(v: SpeechSynthesisVoice): boolean {
  const lang = v.lang.toLowerCase();
  return lang.startsWith("fr") || lang.includes("fr-") || /french|français|francais/.test(v.name.toLowerCase());
}

function isRoboticVoice(v: SpeechSynthesisVoice | null): boolean {
  if (!v) return true;
  return /espeak|festival|rhvoice|mbrola/.test(v.name.toLowerCase());
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

function hasAnyBrowserVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  refreshVoices();
  return window.speechSynthesis.getVoices().length > 0;
}

/** TTS serveur utile si pas de voix, ou seulement des voix robotiques. */
function shouldPreferServerTts(): boolean {
  if (localTtsOk === false && backendTtsOk === false) return false;
  if (!hasAnyBrowserVoice()) return true;
  refreshVoices();
  return isRoboticVoice(preferredVoice);
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
    sources.push({ url: `${apiBase()}/game/tts/`, auth: true, mark: "backend" });
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
    // Éviter d'attacher une voix robotique qui peut échouer / sonner faux
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
    utterance.onerror = (ev) => {
      const reason = (ev as SpeechSynthesisErrorEvent).error;
      // Annulation volontaire → pas un échec « voix morte »
      if (reason === "interrupted" || reason === "canceled") {
        done(false);
        return;
      }
      done(false);
    };

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
    }, 8000);
  });
}

async function speakChunk(text: string, byAi: boolean, generation: number): Promise<boolean> {
  if (generation !== speechGeneration) return false;

  const preferServer = shouldPreferServerTts();

  // Voix navigateur humaines d'abord
  if (!preferServer && typeof window !== "undefined" && window.speechSynthesis) {
    if (!hasAnyBrowserVoice()) {
      await delay(150);
      refreshVoices();
    }
    if (hasAnyBrowserVoice() && !isRoboticVoice(preferredVoice)) {
      const ok = await speakBrowserChunk(text, byAi, generation);
      if (generation !== speechGeneration) return false;
      if (ok) return true;
    }
  }

  // Secours serveur (espeak) — mieux que le silence
  if (localTtsOk !== false || backendTtsOk !== false) {
    const buf = await fetchTtsWav(text);
    if (generation !== speechGeneration) return false;
    if (buf) {
      const ok = await playWavBufferAndWait(buf);
      if (ok) return true;
    }
  }

  // Dernier recours : n'importe quelle voix navigateur (y compris robotique)
  if (typeof window !== "undefined" && window.speechSynthesis) {
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
    const chunks = splitSpeechChunks(fullText);

    for (const chunk of chunks) {
      if (job.generation !== speechGeneration) break;
      await speakChunk(chunk, job.byAi, job.generation);
    }
  }

  lastSpeakingText = "";
  pipelineRunning = false;
  // Si des jobs sont arrivés pendant le drain
  if (pendingJobs.length > 0) {
    void runSpeechPipeline();
  }
}

function enqueueSpeech(text: string, byAi: boolean, interrupt: boolean): void {
  if (interrupt) {
    speechGeneration += 1;
    pendingJobs.length = 0;
    stopCurrentAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Chrome : speak() juste après cancel() est souvent silencieux
    if (speakAfterCancelTimer != null) {
      window.clearTimeout(speakAfterCancelTimer);
      speakAfterCancelTimer = null;
    }
    const generation = speechGeneration;
    pendingJobs.push({ text, byAi, generation });
    speakAfterCancelTimer = window.setTimeout(() => {
      speakAfterCancelTimer = null;
      void runSpeechPipeline();
    }, 80);
    return;
  }

  pendingJobs.push({ text, byAi, generation: speechGeneration });
  void runSpeechPipeline();
}

export function initAiSpeech() {
  if (typeof window === "undefined") return;
  attachVoicesListener();
  refreshVoices();
  [50, 200, 500, 1200, 2500, 5000].forEach((ms) => window.setTimeout(refreshVoices, ms));
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

  if (typeof window === "undefined" || !window.speechSynthesis) return true;

  // Warmup une seule fois — le répéter à chaque clic coupe la lecture en cours
  if (warmupDone) {
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    return true;
  }

  const synth = window.speechSynthesis;
  refreshVoices();
  try {
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.volume = 0;
    warmup.rate = 2;
    warmup.lang = "fr-FR";
    synth.speak(warmup);
    if (synth.paused) synth.resume();
    warmupDone = true;
  } catch {
    /* ignore */
  }

  return true;
}

export function isAiSpeechUnlocked(): boolean {
  return audioUnlocked;
}

export function stopAiSpeech() {
  speechGeneration += 1;
  pendingJobs.length = 0;
  if (speakAfterCancelTimer != null) {
    window.clearTimeout(speakAfterCancelTimer);
    speakAfterCancelTimer = null;
  }
  stopKeepAlive();
  stopCurrentAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  lastSpeakingText = "";
  pipelineRunning = false;
}

export function isSpeechActive(): boolean {
  if (pipelineRunning || pendingJobs.length > 0 || speakAfterCancelTimer != null) return true;
  if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
  if (typeof window !== "undefined" && window.speechSynthesis?.pending) return true;
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
      window.setTimeout(tick, 100);
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
  enqueueSpeech(phrase, false, true);
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
