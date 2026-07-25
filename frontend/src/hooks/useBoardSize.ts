"use client";

import { useEffect, useState, type RefObject } from "react";
import { usePreferencesStore } from "@/store/preferences";

const MOBILE_MQ = "(max-width: 767px)";
const TABLET_MQ = "(min-width: 768px) and (max-width: 1023px)";

/**
 * Applique le facteur de taille choisi par l'utilisateur (en %).
 * - ≤100 % : rétrécit depuis autoSize (toujours visible).
 * - >100 % : agrandit vers la place réellement disponible (conteneur × hauteur),
 *   pas seulement depuis un autoSize déjà plafonné au conteneur.
 */
export function scaleBoardSize(
  autoSize: number,
  containerW: number,
  maxByHeight: number,
  min: number,
  sizePct: number
): number {
  const scale = (Number.isFinite(sizePct) ? sizePct : 100) / 100;
  const hardMax = Math.min(containerW, maxByHeight);

  if (scale <= 1) {
    return Math.max(min, Math.floor(autoSize * scale));
  }

  // Room to grow above the "fit" size, capped by hard layout limits.
  const target = autoSize * scale;
  return Math.max(min, Math.floor(Math.min(target, hardMax)));
}

function readSafeAreaBottom(): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.paddingBottom = "env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  document.body.removeChild(probe);
  return px;
}

export interface BoardSizeOptions {
  min?: number;
  max?: number;
  /** Espace réservé sous l'échiquier (horloge joueur, etc.) */
  extraBottom?: number;
}

/**
 * Calcule la taille carrée optimale de l'échiquier (style Chess.com).
 * Pleine largeur sur mobile, limitée par la hauteur disponible (dvh + barre du bas).
 * Au-dessus de 100 %, élargit le plafond viewport pour que le curseur ait un effet.
 */
export function useBoardSize(
  containerRef: RefObject<HTMLElement | null>,
  { min = 260, max = 720, extraBottom = 0 }: BoardSizeOptions = {}
): number {
  const [size, setSize] = useState(320);
  const boardSizePct = usePreferencesStore((s) => s.boardSize);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const parent = el.parentElement;
      const parentW = parent?.clientWidth ?? 0;
      const rect = el.getBoundingClientRect();
      // Prefer parent width so the shell can shrink below 100% while still
      // measuring the full column for growth headroom.
      const containerW = parentW > 0 ? parentW : rect.width;
      if (containerW <= 0) return;

      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const viewportW = window.visualViewport?.width ?? window.innerWidth;
      const isMobile = window.matchMedia(MOBILE_MQ).matches;
      const isTablet = window.matchMedia(TABLET_MQ).matches;

      const safeBottom = readSafeAreaBottom();
      const mobileNav = isMobile ? 56 + safeBottom : 0;
      const reservedTop = Math.max(0, rect.top);
      const reservedBottom = mobileNav + extraBottom + (isMobile ? 12 : 24);

      const horizontalPad = isMobile ? 4 : 16;
      const maxByWidth = viewportW - horizontalPad;
      const maxByHeight = viewportH - reservedTop - reservedBottom;

      // At >100%, claim a larger share of the viewport so growth is visible.
      const growT = Math.max(0, Math.min(1, (boardSizePct - 100) / 30));
      let widthFrac = 0.68;
      if (isMobile) widthFrac = 1;
      else if (isTablet) widthFrac = 0.94;
      else widthFrac = 0.68 + growT * 0.24; // 0.68 → 0.92

      let cap = max;
      if (isMobile) {
        cap = Math.min(maxByWidth, maxByHeight, max);
      } else if (isTablet) {
        cap = Math.min(viewportW * widthFrac, maxByHeight, 640 + growT * 100);
      } else {
        cap = Math.min(viewportW * widthFrac, maxByHeight, max + growT * 160);
      }

      // Baseline (100%) fits the column; growth can use the raised cap via parent expansion.
      const autoSize = Math.min(containerW, maxByHeight, cap);
      const availW = Math.max(containerW, Math.min(cap, maxByWidth, maxByHeight));
      setSize(scaleBoardSize(autoSize, availW, maxByHeight, min, boardSizePct));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [containerRef, min, max, extraBottom, boardSizePct]);

  return size;
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
