"use client";

import { useEffect, useState, type RefObject } from "react";

const MOBILE_MQ = "(max-width: 767px)";
const TABLET_MQ = "(min-width: 768px) and (max-width: 1023px)";

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
 */
export function useBoardSize(
  containerRef: RefObject<HTMLElement | null>,
  { min = 260, max = 720, extraBottom = 0 }: BoardSizeOptions = {}
): number {
  const [size, setSize] = useState(320);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const containerW = rect.width;
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

      let cap = max;
      if (isMobile) {
        cap = Math.min(maxByWidth, maxByHeight, max);
      } else if (isTablet) {
        cap = Math.min(viewportW * 0.94, maxByHeight, 640);
      } else {
        cap = Math.min(viewportW * 0.68, maxByHeight, max);
      }

      const next = Math.min(containerW, maxByHeight, cap);
      setSize(Math.max(min, Math.floor(next)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [containerRef, min, max, extraBottom]);

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
