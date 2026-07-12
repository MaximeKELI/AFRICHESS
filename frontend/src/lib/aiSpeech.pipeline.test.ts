import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests du pipeline vocal réel (fetch WAV + Audio.play).
 * Ces tests auraient détecté : URL /game/tts/ 404, et silence si WAV non appelé.
 */

describe("speakComment pipeline (mocked window + fetch)", () => {
  const played: string[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    played.length = 0;

    class FakeAudio {
      volume = 1;
      paused = false;
      ended = false;
      onended: ((this: FakeAudio, ev: Event) => void) | null = null;
      onerror: ((this: FakeAudio, ev: Event) => void) | null = null;
      src = "";
      constructor(_src?: string) {
        /* blob url */
      }
      play() {
        played.push("play");
        this.paused = false;
        queueMicrotask(() => {
          this.ended = true;
          this.paused = true;
          this.onended?.(new Event("ended"));
        });
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    }

    vi.stubGlobal(
      "window",
      Object.assign(globalThis, {
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
        setInterval: globalThis.setInterval.bind(globalThis),
        clearInterval: globalThis.clearInterval.bind(globalThis),
        speechSynthesis: undefined,
      })
    );
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("Blob", class {
      constructor(public parts: unknown[], public opts?: unknown) {}
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:fake",
      revokeObjectURL: () => undefined,
    });
    vi.stubGlobal("navigator", { userAgent: "Chromium" });

    fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/game/tts") && !String(url).includes("/games/tts")) {
        return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (String(url).includes("/api/tts") || String(url).includes("/games/tts")) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
        };
      }
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.resetModules();
    const mod = await import("@/lib/aiSpeech");
    mod.__resetAiSpeechForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("calls /api/tts (WAV) when speaking a comment on Chromium", async () => {
    const { speakComment, unlockAiSpeech, waitForSpeechIdle } = await import("@/lib/aiSpeech");
    unlockAiSpeech();
    await speakComment("Beau coup, continuez.", { interrupt: true, forceUnlock: true });
    await waitForSpeechIdle(5000);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u === "/api/tts" || u.endsWith("/api/tts"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/game/tts"))).toBe(false);
    expect(played.length).toBeGreaterThan(0);
  });

  it("getTtsFetchUrls exposes plural games path", async () => {
    const { getTtsFetchUrls } = await import("@/lib/aiSpeech");
    const urls = getTtsFetchUrls();
    expect(urls.backend).toMatch(/\/games\/tts\/$/);
    expect(urls.backend).not.toMatch(/\/api\/game\/tts/);
  });

  it("falls back to /api/games/tts/ when local TTS fails", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url) === "/api/tts") {
        return { ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (String(url).includes("/games/tts/")) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([9, 9]).buffer,
        };
      }
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    });

    vi.resetModules();
    const mod = await import("@/lib/aiSpeech");
    mod.__resetAiSpeechForTests();
    mod.unlockAiSpeech();
    await mod.speakComment("Secours backend.", { interrupt: true, forceUnlock: true });
    await mod.waitForSpeechIdle(5000);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/games/tts/"))).toBe(true);
    expect(played.length).toBeGreaterThan(0);
  });
});
