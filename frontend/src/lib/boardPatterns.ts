import type { CSSProperties } from "react";

export type FlowerColor = "white" | "black" | "cream" | "mint" | "rose";

export interface FloralPattern {
  /** Fleurs sur les cases foncées */
  onDark?: FlowerColor;
  /** Fleurs sur les cases claires */
  onLight?: FlowerColor;
  /** Opacité des pétales (0–1) */
  opacity?: number;
}

const FLOWER_HEX: Record<FlowerColor, string> = {
  white: "#FFFFFF",
  black: "#1A1A1A",
  cream: "#FFF8E7",
  mint: "#86EFAC",
  rose: "#FBCFE8",
};

const CENTER_HEX: Record<FlowerColor, string> = {
  white: "#FDE047",
  black: "#4B5563",
  cream: "#F59E0B",
  mint: "#22C55E",
  rose: "#F472B6",
};

function encodeSvg(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")`;
}

/** Rosace + petits bourgeons dans la case */
function flowerOverlay(color: FlowerColor, opacity: number): string {
  const petal = FLOWER_HEX[color];
  const center = CENTER_HEX[color];
  const o = opacity;
  const o2 = opacity * 0.55;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="${petal}" opacity="${o}">
    <circle cx="50" cy="28" r="11"/>
    <circle cx="68" cy="42" r="11"/>
    <circle cx="62" cy="64" r="11"/>
    <circle cx="38" cy="64" r="11"/>
    <circle cx="32" cy="42" r="11"/>
    <circle cx="50" cy="48" r="7" fill="${center}" opacity="0.95"/>
  </g>
  <g fill="${petal}" opacity="${o2}">
    <circle cx="18" cy="18" r="5"/>
    <circle cx="82" cy="22" r="4"/>
    <circle cx="78" cy="82" r="5"/>
    <circle cx="20" cy="78" r="4"/>
  </g>
</svg>`;
  return encodeSvg(svg);
}

export function buildFloralSquareStyle(
  backgroundColor: string,
  flower: FlowerColor | undefined,
  opacity = 0.38
): CSSProperties {
  if (!flower) {
    return { backgroundColor };
  }
  return {
    backgroundColor,
    backgroundImage: flowerOverlay(flower, opacity),
    backgroundSize: "72% 72%",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}

export function buildThemedSquareStyles(
  darkColor: string,
  lightColor: string,
  floral?: FloralPattern
): { dark: CSSProperties; light: CSSProperties } {
  const op = floral?.opacity ?? 0.38;
  return {
    dark: buildFloralSquareStyle(darkColor, floral?.onDark, op),
    light: buildFloralSquareStyle(lightColor, floral?.onLight, op),
  };
}
