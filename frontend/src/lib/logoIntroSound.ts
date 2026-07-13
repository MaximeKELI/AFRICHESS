/** Son d’atterrissage du logo d’accueil — clic de pièce posée (thème standard). */
export function playLogoLandSound(): void {
  if (typeof window === "undefined") return;
  try {
    if (document.documentElement.classList.contains("low-bandwidth")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const audio = new Audio();
    audio.volume = 0.95;
    const canOgg =
      typeof audio.canPlayType === "function" &&
      audio.canPlayType('audio/ogg; codecs="vorbis"') !== "";
    // Standard = vrai son de pièce sur bois (pas woodland / oiseaux)
    audio.src = canOgg
      ? "/sounds/themes/standard/move.ogg"
      : "/sounds/themes/standard/move.mp3";

    const tryPlay = () => {
      void audio.play().catch(() => {
        const unlock = () => {
          void audio.play().catch(() => undefined);
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
      });
    };
    tryPlay();
  } catch {
    /* ignore */
  }
}
