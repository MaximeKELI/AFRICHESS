"use client";

import { useEffect, useState, type RefObject } from "react";
import { usePreferencesStore } from "@/store/preferences";

const MOBILE_MQ = "(max-width: 767px)";
const TABLET_MQ = "(min-width: 768px) and (max-width: 1023px)";

/** Ignore les micro-variations de fenêtre (barre d'adresse mobile, etc.). */
const VIEWPORT_CHANGE_THRESHOLD_PX = 48;

/**
 * Applique le facteur de taille choisi par l'utilisateur (en %).
 * - ≤100 % : rétrécit depuis la taille « fit ».
 * - >100 % : agrandit vers le plafond layout, sans feedback loop.
 */
export function scaleBoardSize(
  fitSize: number,
  hardMax: number,
  min: number,
  sizePct: number
): number {
  const scale = (Number.isFinite(sizePct) ? sizePct : 100) / 100;
  const cappedMax = Math.max(min, hardMax);

  if (scale <= 1) {
    return Math.max(min, Math.floor(fitSize * scale));
  }

  const target = fitSize * scale;
  return Math.max(min, Math.floor(Math.min(target, cappedMax)));
}

/** @deprecated Conservé pour les tests / anciens appels — préfère la signature à 4 args. */
export function scaleBoardSizeLegacy(
  autoSize: number,
  containerW: number,
  maxByHeight: number,
  min: number,
  sizePct: number
): number {
  return scaleBoardSize(autoSize, Math.min(containerW, maxByHeight), min, sizePct);
}

export interface BoardSizeOptions {
  min?: number;
  max?: number;
  /** Espace réservé sous l'échiquier (horloge joueur, etc.) */
  extraBottom?: number;
}

/**
 * Taille carrée de l'échiquier, **stable** :
 * - basée sur le % utilisateur + viewport
 * - ne réagit PAS aux bannières / toolbars / ResizeObserver du plateau
 * - ne recalcule qu'au changement de préférence ou de fenêtre (seuil)
 */
export function useBoardSize(
  _containerRef: RefObject<HTMLElement | null>,
  { min = 260, max = 720, extraBottom = 0 }: BoardSizeOptions = {}
): number {
  const boardSizePct = usePreferencesStore((s) => s.boardSize);
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return 320;
    return computeStableBoardSize(boardSizePct, min, max, extraBottom);
  });

  useEffect(() => {
    let lastVW = typeof window !== "undefined" ? window.innerWidth : 0;
    let lastVH = typeof window !== "undefined" ? window.innerHeight : 0;
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const apply = () => {
      setSize(computeStableBoardSize(boardSizePct, min, max, extraBottom));
      lastVW = window.innerWidth;
      lastVH = window.innerHeight;
    };

    const onResize = () => {
      const dw = Math.abs(window.innerWidth - lastVW);
      const dh = Math.abs(window.innerHeight - lastVH);
      if (dw < VIEWPORT_CHANGE_THRESHOLD_PX && dh < VIEWPORT_CHANGE_THRESHOLD_PX) {
        return;
      }
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(apply, 120);
    };

    apply();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", apply);
    return () => {
      if (debounceId) clearTimeout(debounceId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", apply);
    };
  }, [boardSizePct, min, max, extraBottom]);

  return size;
}

/** Calcule une taille fixe à partir du viewport (sans mesurer le plateau). */
export function computeStableBoardSize(
  sizePct: number,
  min: number,
  max: number,
  extraBottom = 0
): number {
  if (typeof window === "undefined") return Math.max(min, 320);

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const isMobile = window.matchMedia(MOBILE_MQ).matches;
  const isTablet = window.matchMedia(TABLET_MQ).matches;

  // Réserves fixes — volontairement indépendantes du contenu dynamique
  // (bannières, toolbar flèches, messages) pour éviter le « zoom » spontané.
  const navH = isMobile ? 52 : 64;
  const bottomChrome = isMobile ? 64 + extraBottom : 28 + extraBottom;
  const sidePanel = isMobile ? 0 : isTablet ? 0 : 320;
  const horizontalPad = isMobile ? 8 : 32;

  const maxByWidth = Math.max(min, viewportW - horizontalPad - sidePanel);
  const maxByHeight = Math.max(min, viewportH - navH - bottomChrome);

  let widthFrac = 0.72;
  if (isMobile) widthFrac = 1;
  else if (isTablet) widthFrac = 0.92;

  const fitCap = isMobile
    ? Math.min(maxByWidth, maxByHeight, max)
    : isTablet
      ? Math.min(viewportW * widthFrac, maxByHeight, 640)
      : Math.min(viewportW * widthFrac, maxByHeight, max);

  const fitSize = Math.max(min, Math.floor(Math.min(maxByWidth, maxByHeight, fitCap)));
  const hardMax = Math.max(min, Math.floor(Math.min(maxByWidth, maxByHeight, max)));

  return scaleBoardSize(fitSize, hardMax, min, sizePct);
}

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const fn = () => setCoarse(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return coarse;
}
