#!/usr/bin/env node
/**
 * Génère 32 fonds d'écran SVG pour la section Background (profil / échiquier).
 * Usage: node scripts/generate-board-backgrounds.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/images/backgrounds");

mkdirSync(OUT, { recursive: true });

function svg(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
${body}
</svg>`;
}

function radial(id, stops) {
  const s = stops.map(([o, c]) => `<stop offset="${o}%" stop-color="${c}"/>`).join("");
  return `<radialGradient id="${id}" cx="50%" cy="50%" r="70%">${s}</radialGradient>`;
}

function linear(id, x1, y1, x2, y2, stops) {
  const s = stops.map(([o, c]) => `<stop offset="${o}%" stop-color="${c}"/>`).join("");
  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${s}</linearGradient>`;
}

function sun(cx, cy, r, color = "#FDE68A") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.9"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 1.8}" fill="${color}" opacity="0.15"/>`;
}

function hills(colors, baseY = 720) {
  return colors
    .map(
      ([c, d], i) =>
        `<path d="M0 ${baseY} Q${200 + i * 80} ${baseY - d} 400 ${baseY - d * 0.6} T800 ${baseY - d * 0.8} T1200 ${baseY - d * 0.5} T1600 ${baseY - d * 0.7} T1920 ${baseY - d * 0.4} L1920 1080 L0 1080 Z" fill="${c}" opacity="${0.85 - i * 0.12}"/>`
    )
    .join("\n");
}

function stars(count, seed = 1) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: count }, () => {
    const x = rnd() * 1920;
    const y = rnd() * 600;
    const r = rnd() * 2 + 0.5;
    const o = rnd() * 0.6 + 0.2;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#FFF" opacity="${o.toFixed(2)}"/>`;
  }).join("\n");
}

function baobabs() {
  return `<g opacity="0.85">
    <rect x="280" y="520" width="18" height="180" rx="4" fill="#3D2914"/>
    <ellipse cx="289" cy="500" rx="55" ry="35" fill="#2D5016"/>
    <rect x="720" y="560" width="22" height="140" rx="5" fill="#3D2914"/>
    <ellipse cx="731" cy="545" rx="65" ry="40" fill="#1B4332"/>
    <rect x="1180" y="530" width="16" height="170" rx="4" fill="#4A3728"/>
    <ellipse cx="1188" cy="515" rx="48" ry="32" fill="#2D6A4F"/>
  </g>`;
}

function kenteStripes() {
  const colors = ["#D4A017", "#1B7A3D", "#C45C26", "#0D1117", "#F5E6B8", "#8B4513"];
  return colors
    .map(
      (c, i) =>
        `<rect x="${i * 320}" y="0" width="320" height="1080" fill="${c}" opacity="${0.15 + (i % 3) * 0.08}"/>
     <path d="M${i * 320} 0 L${(i + 1) * 320} 1080 L${(i + 1) * 320 - 40} 1080 L${i * 320 - 40} 0 Z" fill="${c}" opacity="0.25"/>`
    )
    .join("\n");
}

function adinkraPattern() {
  const g = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * 160 + (row % 2) * 80;
      const y = row * 135;
      g.push(
        `<circle cx="${x + 60}" cy="${y + 60}" r="28" fill="none" stroke="#D4A017" stroke-width="3" opacity="0.2"/>
         <path d="M${x + 60} ${y + 30} L${x + 90} ${y + 90} L${x + 30} ${y + 90} Z" fill="none" stroke="#1B7A3D" stroke-width="2" opacity="0.18"/>`
      );
    }
  }
  return g.join("\n");
}

const BACKGROUNDS = [
  {
    id: "savanna-sunset",
    body: (d) => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#FF6B35"], [40, "#F7931E"], [70, "#FFD23F"], [100, "#FFE8A3"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${sun(1600, 220, 90, "#FFF4B8")}
      ${hills([["#5C4033", 180], ["#3D2914", 120], ["#2D5016", 80]], 780)}
      ${baobabs()}`,
  },
  {
    id: "savanna-dawn",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#1E3A5F"], [35, "#E879A9"], [60, "#FBBF24"], [100, "#FEF3C7"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${sun(300, 280, 70, "#FDE68A")}
      ${hills([["#4A6741", 150], ["#2D5016", 100], ["#1B4332", 60]], 800)}`,
  },
  {
    id: "sahara-dunes",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#0EA5E9"], [50, "#7DD3FC"], [100, "#FEF3C7"]])}
      ${linear("d1", 0, 100, 100, 0, [[0, "#D97706"], [100, "#FCD34D"]])}
      ${linear("d2", 0, 100, 100, 0, [[0, "#B45309"], [100, "#F59E0B"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      <ellipse cx="960" cy="900" rx="1100" ry="280" fill="url(#d1)"/>
      <ellipse cx="600" cy="820" rx="700" ry="200" fill="url(#d2)" opacity="0.8"/>
      <ellipse cx="1400" cy="850" rx="650" ry="180" fill="#FBBF24" opacity="0.5"/>`,
  },
  {
    id: "rainforest",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#064E3B"], [60, "#047857"], [100, "#6EE7B7"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${hills([["#14532D", 200], ["#166534", 160], ["#052E16", 120]], 700)}
      <g opacity="0.4">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 1920}" cy="${200 + (i * 53) % 400}" r="${30 + (i % 5) * 15}" fill="#22C55E"/>`).join("")}</g>`,
  },
  {
    id: "kilimanjaro",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#1E40AF"], [50, "#93C5FD"], [100, "#EFF6FF"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      <polygon points="960,180 600,780 1320,780" fill="#64748B"/>
      <polygon points="960,180 780,780 1140,780" fill="#94A3B8"/>
      <polygon points="960,250 860,550 1060,550" fill="#F8FAFC"/>
      ${hills([["#365314", 100], ["#3F6212", 70]], 780)}`,
  },
  {
    id: "nile-dusk",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#312E81"], [40, "#7C3AED"], [70, "#F472B6"], [100, "#FDE68A"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${stars(80, 42)}
      <path d="M0 700 Q480 650 960 680 T1920 660 L1920 1080 L0 1080 Z" fill="#1E3A8A" opacity="0.7"/>
      <ellipse cx="960" cy="700" rx="800" ry="40" fill="#60A5FA" opacity="0.3"/>`,
  },
  {
    id: "baobab-night",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#0F172A"], [50, "#1E1B4B"], [100, "#312E81"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${stars(120, 7)}
      ${sun(1500, 150, 50, "#E2E8F0")}
      ${baobabs()}`,
  },
  {
    id: "kente-gold",
    body: () => `
      <defs>${linear("base", 0, 0, 100, 100, [[0, "#1B4332"], [100, "#064E3B"]])}</defs>
      <rect width="1920" height="1080" fill="url(#base)"/>
      ${kenteStripes()}`,
  },
  {
    id: "kente-royal",
    body: () => `
      <rect width="1920" height="1080" fill="#0D1117"/>
      ${kenteStripes()}
      <rect width="1920" height="1080" fill="url(#none)" opacity="0"/>
      <g opacity="0.3">${adinkraPattern()}</g>`,
  },
  {
    id: "adinkra-gold",
    body: () => `
      <defs>${linear("bg", 0, 0, 0, 100, [[0, "#422006"], [100, "#78350F"]])}</defs>
      <rect width="1920" height="1080" fill="url(#bg)"/>
      ${adinkraPattern()}`,
  },
  {
    id: "mudcloth",
    body: () => `
      <rect width="1920" height="1080" fill="#C4A574"/>
      ${Array.from({ length: 20 }, (_, r) =>
        Array.from({ length: 30 }, (_, c) =>
          `<rect x="${c * 64 + (r % 2) * 32}" y="${r * 54}" width="24" height="24" rx="2" fill="#8B6914" opacity="0.25"/>`
        ).join("")
      ).join("")}`,
  },
  {
    id: "ankara-burst",
    body: () => `
      <defs>${radial("burst", [[0, "#DB2777"], [40, "#F59E0B"], [70, "#1B7A3D"], [100, "#0D1117"]])}</defs>
      <rect width="1920" height="1080" fill="url(#burst)"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `<ellipse cx="960" cy="540" rx="900" ry="80" fill="#D4A017" opacity="0.08" transform="rotate(${(a * 180) / Math.PI} 960 540)"/>`;
      }).join("")}`,
  },
  {
    id: "coral-coast",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#38BDF8"], [60, "#7DD3FC"], [100, "#FEF9C3"]])}
      ${linear("sea", 0, 0, 0, 100, [[0, "#0891B2"], [100, "#06B6D4"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      <rect y="620" width="1920" height="460" fill="url(#sea)"/>
      <ellipse cx="960" cy="620" rx="960" ry="30" fill="#22D3EE" opacity="0.4"/>`,
  },
  {
    id: "lagos-neon",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#0F172A"], [100, "#1E293B"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${Array.from({ length: 25 }, (_, i) =>
        `<rect x="${80 + i * 72}" y="${400 - (i % 5) * 40}" width="40" height="${300 + (i % 7) * 50}" fill="${["#D4A017", "#1B7A3D", "#C45C26", "#38BDF8"][i % 4]}" opacity="0.35"/>`
      ).join("")}
      ${stars(40, 99)}`,
  },
  {
    id: "cape-mountains",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#1E3A8A"], [50, "#93C5FD"], [100, "#E0F2FE"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      <polygon points="0,600 400,350 800,550 1200,300 1600,500 1920,400 1920,1080 0,1080" fill="#334155" opacity="0.8"/>
      <polygon points="200,650 700,400 1100,580 1920,450 1920,1080 0,1080" fill="#475569" opacity="0.6"/>`,
  },
  {
    id: "serengeti",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#7DD3FC"], [100, "#FEF08A"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${hills([["#CA8A04", 90], ["#A16207", 70], ["#854D0E", 50]], 820)}
      <g opacity="0.6"><ellipse cx="400" cy="780" rx="8" ry="14" fill="#422006"/><ellipse cx="420" cy="775" rx="6" ry="10" fill="#422006"/></g>`,
  },
  {
    id: "marrakech",
    body: () => `
      <defs>${linear("wall", 0, 0, 100, 100, [[0, "#C2410C"], [100, "#EA580C"]])}</defs>
      <rect width="1920" height="1080" fill="url(#wall)"/>
      ${Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 12 }, (_, c) =>
          `<path d="M${c * 160} ${r * 135} h80 v80 h-80 Z" fill="none" stroke="#FDE68A" stroke-width="2" opacity="0.25"/>`
        ).join("")
      ).join("")}`,
  },
  {
    id: "ethiopian-highlands",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#4C1D95"], [50, "#A78BFA"], [100, "#F5D0FE"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${hills([["#4C1D95", 220], ["#6D28D9", 170], ["#7C3AED", 120]], 750)}`,
  },
  {
    id: "victoria-mist",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#64748B"], [100, "#CBD5E1"]])}
      ${linear("water", 0, 0, 0, 100, [[0, "#0E7490"], [100, "#22D3EE"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      <rect y="500" width="1920" height="580" fill="url(#water)"/>
      ${Array.from({ length: 15 }, (_, i) =>
        `<ellipse cx="${200 + i * 120}" cy="${480 + (i % 3) * 20}" rx="100" ry="60" fill="#F8FAFC" opacity="0.35"/>`
      ).join("")}`,
  },
  {
    id: "sahara-stars",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#020617"], [60, "#1E1B4B"], [100, "#312E81"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${stars(200, 13)}
      ${linear("d", 0, 100, 0, 0, [[0, "#78350F"], [100, "#451A03"]])}
      <ellipse cx="960" cy="950" rx="1000" ry="200" fill="#92400E" opacity="0.6"/>`,
  },
  {
    id: "fireflies",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#1E3A8A"], [100, "#172554"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${hills([["#14532D", 100], ["#052E16", 70]], 850)}
      ${Array.from({ length: 60 }, (_, i) => {
        const x = (i * 137) % 1920;
        const y = 400 + (i * 89) % 400;
        return `<circle cx="${x}" cy="${y}" r="3" fill="#FDE047" opacity="${0.3 + (i % 5) * 0.12}"/>`;
      }).join("")}`,
  },
  {
    id: "marble-hall",
    body: () => `
      <defs>${linear("wall", 0, 0, 0, 100, [[0, "#F8FAFC"], [100, "#E2E8F0"]])}
      ${linear("floor", 0, 100, 0, 0, [[0, "#CBD5E1"], [100, "#94A3B8"]])}</defs>
      <rect width="1920" height="1080" fill="url(#wall)"/>
      <rect y="700" width="1920" height="380" fill="url(#floor)"/>
      ${Array.from({ length: 6 }, (_, i) =>
        `<rect x="${200 + i * 280}" y="100" width="120" height="600" fill="#F1F5F9" opacity="0.5"/>`
      ).join("")}`,
  },
  {
    id: "library-classic",
    body: () => `
      <defs>${linear("bg", 0, 0, 0, 100, [[0, "#422006"], [100, "#292524"]])}</defs>
      <rect width="1920" height="1080" fill="url(#bg)"/>
      ${Array.from({ length: 14 }, (_, i) =>
        `<rect x="${60 + i * 130}" y="80" width="100" height="920" fill="${["#7F1D1D", "#92400E", "#365314", "#1E3A8A"][i % 4]}" opacity="0.5" rx="4"/>`
      ).join("")}`,
  },
  {
    id: "midnight-tournament",
    body: () => `
      <defs>${radial("spot", [[0, "#1E293B"], [50, "#0F172A"], [100, "#020617"]])}</defs>
      <rect width="1920" height="1080" fill="url(#spot)"/>
      <ellipse cx="960" cy="200" rx="400" ry="120" fill="#FDE047" opacity="0.08"/>
      <rect x="560" y="600" width="800" height="400" rx="20" fill="#334155" opacity="0.3"/>`,
  },
  {
    id: "aurora",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#0F172A"], [100, "#1E293B"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${stars(100, 21)}
      <path d="M0 400 Q480 200 960 350 T1920 300" fill="none" stroke="#34D399" stroke-width="80" opacity="0.25"/>
      <path d="M0 450 Q480 250 960 400 T1920 350" fill="none" stroke="#A78BFA" stroke-width="60" opacity="0.2"/>`,
  },
  {
    id: "deep-ocean",
    body: () => `
      <defs>${linear("sea", 0, 0, 0, 100, [[0, "#0C4A6E"], [50, "#0369A1"], [100, "#082F49"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sea)"/>
      ${Array.from({ length: 8 }, (_, i) =>
        `<ellipse cx="${240 * i}" cy="${200 + i * 80}" rx="200" ry="30" fill="#38BDF8" opacity="0.1"/>`
      ).join("")}`,
  },
  {
    id: "sakura",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#FDF2F8"], [100, "#FCE7F3"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${Array.from({ length: 80 }, (_, i) => {
        const x = (i * 73) % 1920;
        const y = (i * 47) % 1080;
        return `<circle cx="${x}" cy="${y}" r="${4 + (i % 3) * 2}" fill="#F472B6" opacity="0.5"/>`;
      }).join("")}`,
  },
  {
    id: "autumn-forest",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#FEF3C7"], [100, "#FDE68A"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${hills([["#92400E", 180], ["#B45309", 140], ["#D97706", 100]], 760)}`,
  },
  {
    id: "winter-frost",
    body: () => `
      <defs>${linear("sky", 0, 0, 0, 100, [[0, "#E0F2FE"], [100, "#F8FAFC"]])}</defs>
      <rect width="1920" height="1080" fill="url(#sky)"/>
      ${Array.from({ length: 50 }, (_, i) =>
        `<circle cx="${(i * 97) % 1920}" cy="${(i * 61) % 1080}" r="${2 + (i % 4)}" fill="#BAE6FD" opacity="0.6"/>`
      ).join("")}
      ${hills([["#E2E8F0", 120], ["#CBD5E1", 90]], 820)}`,
  },
  {
    id: "zen-garden",
    body: () => `
      <rect width="1920" height="1080" fill="#F5F5F4"/>
      ${Array.from({ length: 30 }, (_, i) =>
        `<circle cx="${960 + Math.cos(i) * 300}" cy="${540 + Math.sin(i) * 200}" r="${80 + i * 8}" fill="none" stroke="#A8A29E" stroke-width="1" opacity="0.3"/>`
      ).join("")}
      <circle cx="960" cy="540" r="60" fill="#78716C" opacity="0.2"/>`,
  },
  {
    id: "cosmic-nebula",
    body: () => `
      <defs>${radial("nebula", [[0, "#581C87"], [35, "#7C3AED"], [60, "#DB2777"], [100, "#0F172A"]])}</defs>
      <rect width="1920" height="1080" fill="#0F172A"/>
      <ellipse cx="960" cy="540" rx="900" ry="600" fill="url(#nebula)" opacity="0.85"/>
      ${stars(150, 55)}`,
  },
  {
    id: "warm-cafe",
    body: () => `
      <defs>${linear("wall", 0, 0, 0, 100, [[0, "#44403C"], [100, "#292524"]])}
      ${radial("lamp", [[0, "#FDE68A"], [100, "transparent"]])}</defs>
      <rect width="1920" height="1080" fill="url(#wall)"/>
      <circle cx="960" cy="200" r="300" fill="url(#lamp)" opacity="0.35"/>
      <rect x="660" y="650" width="600" height="30" rx="8" fill="#78350F" opacity="0.5"/>`,
  },
  {
    id: "royal-purple",
    body: () => `
      <defs>${linear("velvet", 0, 0, 100, 100, [[0, "#4C1D95"], [50, "#6D28D9"], [100, "#3B0764"]])}</defs>
      <rect width="1920" height="1080" fill="url(#velvet)"/>
      ${Array.from({ length: 20 }, (_, i) =>
        `<line x1="0" y1="${i * 54}" x2="1920" y2="${i * 54 + 40}" stroke="#A78BFA" stroke-width="1" opacity="0.08"/>`
      ).join("")}`,
  },
  {
    id: "emerald-palace",
    body: () => `
      <defs>${linear("bg", 0, 0, 0, 100, [[0, "#064E3B"], [50, "#047857"], [100, "#065F46"]])}
      ${linear("gold", 0, 0, 100, 0, [[0, "#D4A017"], [100, "#FDE68A"]])}</defs>
      <rect width="1920" height="1080" fill="url(#bg)"/>
      ${Array.from({ length: 5 }, (_, i) =>
        `<rect x="${360 * i}" y="0" width="4" height="1080" fill="url(#gold)" opacity="0.2"/>`
      ).join("")}
      <ellipse cx="960" cy="900" rx="700" ry="100" fill="#D4A017" opacity="0.15"/>`,
  },
];

for (const bg of BACKGROUNDS) {
  const content = svg(1920, 1080, bg.body(bg));
  writeFileSync(join(OUT, `${bg.id}.svg`), content, "utf8");
  console.log(`✓ ${bg.id}.svg`);
}

console.log(`\n${BACKGROUNDS.length} backgrounds generated in ${OUT}`);
