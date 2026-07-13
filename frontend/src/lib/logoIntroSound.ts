/** Son d’atterrissage du logo d’accueil (pion posé). */
export function playLogoLandSound(): void {
  if (typeof window === "undefined") return;
  try {
    if (document.documentElement.classList.contains("low-bandwidth")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const audio = new Audio("/sounds/themes/woodland/move.mp3");
    audio.volume = 0.9;
    const tryPlay = () => {
      void audio.play().catch(() => {
        // Autoplay bloqué : jouer au premier geste utilisateur
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
