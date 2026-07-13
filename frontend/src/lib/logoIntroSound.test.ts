import { afterEach, describe, expect, it, vi } from "vitest";

describe("logoIntroSound", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("reset permet de rejouer après un play", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "Audio",
      vi.fn(() => ({
        preload: "auto",
        volume: 1,
        muted: false,
        setAttribute: vi.fn(),
        load: vi.fn(),
        play,
        pause: vi.fn(),
        currentTime: 0,
      }))
    );
    vi.stubGlobal("window", {
      ...window,
      AudioContext: undefined,
      webkitAudioContext: undefined,
      matchMedia: () => ({ matches: false }),
    });

    const mod = await import("./logoIntroSound");
    mod.resetLogoLandSoundForNewPageLoad();
    expect(mod.hasPlayedLogoLandSound()).toBe(false);

    mod.playLogoLandSoundFromGesture();
    expect(mod.hasPlayedLogoLandSound()).toBe(true);
    expect(play).toHaveBeenCalled();

    mod.resetLogoLandSoundForNewPageLoad();
    expect(mod.hasPlayedLogoLandSound()).toBe(false);
  });
});
