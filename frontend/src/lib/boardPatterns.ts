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

export interface WoodPattern {
  /** Finition laquée brillante avec reflets speculaires */
  glossy?: boolean;
}

function woodGrainOverlay(isDark: boolean): string {
  const seed = isDark ? 7 : 13;
  const strokeMain = isDark ? "#180C06" : "#8B5E34";
  const strokeFine = isDark ? "#2A1810" : "#A67C52";
  const grainLines = Array.from({ length: 24 }, (_, i) => {
    const y = i * 10.5 + (i % 2) * 2;
    const o = (0.14 + (i % 5) * 0.06) * (isDark ? 1 : 0.72);
    const sw = isDark ? 1.15 : 0.85;
    return `<path d="M0 ${y} C64 ${y - 3}, 128 ${y + 4}, 256 ${y - 1}" fill="none" stroke="${strokeMain}" stroke-width="${sw}" opacity="${o}"/>`;
  }).join("");
  const fineLines = Array.from({ length: 14 }, (_, i) => {
    const y = i * 18 + 4;
    return `<path d="M0 ${y} Q128 ${y + 5} 256 ${y - 2}" fill="none" stroke="${strokeFine}" stroke-width="0.55" opacity="${isDark ? 0.22 : 0.16}"/>`;
  }).join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <filter id="wg-${seed}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035 1.15" numOctaves="5" seed="${seed}" result="n"/>
      <feColorMatrix in="n" type="matrix"
        values="0.75 0 0 0 ${isDark ? 0.06 : 0.58}
                0.48 0 0 0 ${isDark ? 0.04 : 0.4}
                0.22 0 0 0 ${isDark ? 0.02 : 0.2}
                0 0 0 ${isDark ? 0.58 : 0.34} 0" result="c"/>
      <feBlend in="SourceGraphic" in2="c" mode="multiply"/>
    </filter>
    <linearGradient id="gloss-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${isDark ? 0.32 : 0.55}"/>
      <stop offset="20%" stop-color="#FFFFFF" stop-opacity="${isDark ? 0.12 : 0.22}"/>
      <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="${isDark ? 0.07 : 0.04}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${isDark ? 0.2 : 0.11}"/>
    </linearGradient>
    <linearGradient id="depth-${seed}" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${isDark ? 0.14 : 0.24}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${isDark ? 0.22 : 0.14}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="${isDark ? "#4A2C1A" : "#E5C088"}" filter="url(#wg-${seed})" opacity="0.88"/>
  ${grainLines}
  ${fineLines}
  <rect width="256" height="256" fill="url(#depth-${seed})" opacity="0.34"/>
  <rect width="256" height="256" fill="url(#gloss-${seed})"/>
</svg>`;
  return encodeSvg(svg);
}

export function buildWoodSquareStyle(
  backgroundColor: string,
  isDark: boolean,
  glossy = true
): CSSProperties {
  const depthGrad = isDark
    ? `linear-gradient(152deg, rgba(255,255,255,0.1) 0%, ${backgroundColor} 38%, rgba(0,0,0,0.28) 100%)`
    : `linear-gradient(152deg, rgba(255,255,255,0.42) 0%, ${backgroundColor} 42%, rgba(100,65,35,0.2) 100%)`;

  return {
    backgroundColor,
    backgroundImage: `${depthGrad}, ${woodGrainOverlay(isDark)}`,
    backgroundSize: "100% 100%, cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    ...(glossy && {
      boxShadow: isDark
        ? "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 5px rgba(0,0,0,0.38)"
        : "inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -1px 4px rgba(70,45,20,0.22)",
    }),
  };
}

export function buildWoodSquareStyles(
  darkColor: string,
  lightColor: string,
  pattern?: WoodPattern
): { dark: CSSProperties; light: CSSProperties } {
  const glossy = pattern?.glossy !== false;
  return {
    dark: buildWoodSquareStyle(darkColor, true, glossy),
    light: buildWoodSquareStyle(lightColor, false, glossy),
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
