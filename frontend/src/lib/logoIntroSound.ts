/**
 * Son « pion posé » pour l’intro du logo (page d’accueil uniquement).
 *
 * Les navigateurs bloquent souvent l’autoplay au refresh. On :
 * 1. précharge le fichier dès l’arrivée ;
 * 2. tente la lecture à l’atterrissage ;
 * 3. si bloqué, joue au premier geste (clic / touche / touch).
 */

const MOVE_SRC = "/sounds/themes/standard/move.mp3";

let primedAudio: HTMLAudioElement | null = null;
let unlockInstalled = false;
let playWhenUnlocked = false;
let alreadyPlayedThisLoad = false;

function makeAudio(): HTMLAudioElement {
  const a = new Audio(MOVE_SRC);
  a.preload = "auto";
  a.volume = 1;
  a.setAttribute("playsinline", "true");
  return a;
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  if (!primedAudio) {
    primedAudio = makeAudio();
    primedAudio.load();
  }
  installUnlockListeners();
}

function installUnlockListeners(): void {
  if (typeof window === "undefined" || unlockInstalled) return;
  unlockInstalled = true;

  const unlock = () => {
    // Débloque le contexte média de l’origine
    const a = primedAudio ?? makeAudio();
    primedAudio = a;
    a.muted = true;
    void a
      .play()
      .then(() => {
        a.pause();
        a.muted = false;
        a.currentTime = 0;
      })
      .catch(() => undefined);

    if (playWhenUnlocked && !alreadyPlayedThisLoad) {
      playWhenUnlocked = false;
      void playLogoLandSound(true);
    }
  };

  // Capture : le premier geste sur la page débloque + rejoue si besoin
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
  window.addEventListener("touchstart", unlock, { capture: true });
}

async function playOnce(): Promise<boolean> {
  preloadLogoLandSound();
  const base = primedAudio ?? makeAudio();
  primedAudio = base;

  // Clone pour pouvoir rejouer même si l’instance est busy
  const node = base.cloneNode(true) as HTMLAudioElement;
  node.volume = 1;
  node.muted = false;
  node.currentTime = 0;

  try {
    await node.play();
    return true;
  } catch {
    // Tentative muted → unmute (certains navigateurs)
    try {
      node.muted = true;
      await node.play();
      node.muted = false;
      node.currentTime = 0;
      await node.play();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * @param fromGesture true si appelé depuis un geste utilisateur (autoplay OK)
 */
export async function playLogoLandSound(fromGesture = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (alreadyPlayedThisLoad && !fromGesture) return alreadyPlayedThisLoad;

  const ok = await playOnce();
  if (ok) {
    alreadyPlayedThisLoad = true;
    playWhenUnlocked = false;
    return true;
  }

  // Autoplay bloqué (typique au F5) → jouer au prochain geste
  playWhenUnlocked = true;
  installUnlockListeners();
  return false;
}

/** Remise à zéro à chaque montage de la page d’accueil (chaque refresh). */
export function resetLogoLandSoundForNewPageLoad(): void {
  alreadyPlayedThisLoad = false;
  playWhenUnlocked = false;
  if (primedAudio) {
    primedAudio.pause();
    primedAudio.currentTime = 0;
  }
}
