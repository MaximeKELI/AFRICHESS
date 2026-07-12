/**
 * Synthèse vocale — commentaires IA et coach.
 * Priorité : voix navigateur FR naturelles → Web Speech FR → TTS serveur (dernier recours).
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
let pendingPlay: (() => Promise<void>) | null = null;

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
  // Voix neurales / cloud — les plus humaines
  if (/google français|google french|google ukrainian|google/.test(n) && /fr/.test(v.lang.toLowerCase())) {
    return 100;
  }
  if (/neural|natural|premium|wavenet|online \(natural\)|enhanced/.test(n)) return 98;
  if (/microsoft.*(hortense|julie|pauline|denise|henri)|azure/.test(n)) return 92;
  if (/thomas|amélie|aurelie|aurélie|marie|virginie|stephanie/.test(n)) return 88;
  if (/apple|siri|éloquence|eloquence|compact/.test(n)) return 82;
  if (/google/.test(n)) return 80;
  if (/microsoft|azure/.test(n)) return 75;
  if (v.localService && !/espeak|festival|rhvoice/.test(n)) return 70;
  if (/mbrola/.test(n)) return 50;
  if (/espeak|festival|rhvoice/.test(n)) return 5;
  return 45;
}

function isFrenchVoice(v: SpeechSynthesisVoice): boolean {
  const lang = v.lang.toLowerCase();
  return lang.startsWith("fr") || lang.includes("fr-") || /french|français|francais/.test(v.name.toLowerCase());
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

/** Toute voix FR navigateur vaut mieux qu'espeak robotique. */
function hasBrowserFrenchVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  refreshVoices();
  return window.speechSynthesis.getVoices().some(isFrenchVoice);
}

function hasAnyBrowserVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  refreshVoices();
  return window.speechSynthesis.getVoices().length > 0;
}

/** espeak seulement si le navigateur n'a aucune voix. */
function shouldUseServerTts(): boolean {
  if (hasBrowserFrenchVoice() || hasAnyBrowserVoice()) return false;
  if (localTtsOk === false && backendTtsOk === false) return false;
  return true;
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
    // Chrome : parfois bloqué tant que cancel n'a pas « drainé »
    if (synth.paused) synth.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = preferredVoice?.lang?.startsWith("fr") ? preferredVoice.lang : "fr-FR";
    // Prosodie plus naturelle (moins « robot »)
    utterance.rate = byAi ? 0.92 : 0.96;
    utterance.pitch = byAi ? 1.05 : 1.08;
    utterance.volume = 1;
    refreshVoices();
    if (preferredVoice) utterance.voice = preferredVoice;

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

    // Contournement Chrome : utterance fantôme / pause silencieuse
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

  // Navigateur d'abord (voix humaines) ; serveur seulement en secours
  if (typeof window !== "undefined" && window.speechSynthesis && hasAnyBrowserVoice()) {
    const ok = await speakBrowserChunk(text, byAi);
    if (ok) return true;
  }

  if (shouldUseServerTts() || !hasAnyBrowserVoice()) {
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

  const synth = window.speechSynthesis;
  refreshVoices();
  try {
    // Warmup silencieux pour lever le blocage autoplay
    const warmup = new SpeechSynthesisUtterance("\u200b");
    warmup.volume = 0;
    warmup.rate = 2;
    warmup.lang = "fr-FR";
    if (preferredVoice) warmup.voice = preferredVoice;
    synth.speak(warmup);
    if (synth.paused) synth.resume();
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
