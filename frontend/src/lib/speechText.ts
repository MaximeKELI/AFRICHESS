/** Découpe et normalise le texte pour TTS (français + notation échecs). */

const PIECE_FR: Record<string, string> = {
  K: "roi",
  Q: "dame",
  R: "tour",
  B: "fou",
  N: "cavalier",
};

const FILE_FR: Record<string, string> = {
  a: "a",
  b: "bé",
  c: "cé",
  d: "dé",
  e: "e",
  f: "effe",
  g: "gé",
  h: "ache",
};

/** Convertit une case (e4) en français parlé. */
function speakSquare(sq: string): string {
  const file = sq[0]?.toLowerCase() ?? "";
  const rank = sq[1] ?? "";
  return `${FILE_FR[file] ?? file} ${rank}`.trim();
}

/**
 * Convertit un coup SAN en français oral (ex. Nf3 → « cavalier effe 3 »).
 * Couvre les formes courantes : O-O, prises, échec, mat, promotion.
 */
export function sanToSpokenFrench(san: string): string {
  const raw = san.trim();
  if (!raw) return "";

  if (/^O-O-O|^0-0-0/i.test(raw)) {
    const suffix = raw.includes("#") ? ", échec et mat" : raw.includes("+") ? ", échec" : "";
    return `grand roque${suffix}`;
  }
  if (/^O-O|^0-0/i.test(raw)) {
    const suffix = raw.includes("#") ? ", échec et mat" : raw.includes("+") ? ", échec" : "";
    return `petit roque${suffix}`;
  }

  let s = raw.replace(/[+#]/g, "");
  const check = raw.includes("#") ? ", échec et mat" : raw.includes("+") ? ", échec" : "";

  let promo = "";
  const promoMatch = s.match(/=([QRBN])/i);
  if (promoMatch) {
    promo = `, promotion en ${PIECE_FR[promoMatch[1].toUpperCase()] ?? promoMatch[1]}`;
    s = s.replace(/=[QRBN]/i, "");
  }

  const capture = s.includes("x");
  s = s.replace(/x/g, "");

  let piece = "pion";
  if (/^[KQRBN]/.test(s)) {
    piece = PIECE_FR[s[0].toUpperCase()] ?? "pièce";
    s = s.slice(1);
  }

  // Désambiguïsation : Nbd2, R1e2, Qh4xe1 → garder la précision orale
  let disamb = "";
  const disambMatch = s.match(/^([a-h]?[1-8]?)([a-h][1-8])$/i);
  let dest = "";
  if (disambMatch) {
    const maybeDisamb = disambMatch[1];
    dest = disambMatch[2];
    if (maybeDisamb) {
      if (/^[a-h]$/i.test(maybeDisamb)) {
        disamb = ` de la colonne ${FILE_FR[maybeDisamb.toLowerCase()] ?? maybeDisamb}`;
      } else if (/^[1-8]$/.test(maybeDisamb)) {
        disamb = ` de la rangée ${maybeDisamb}`;
      } else if (/^[a-h][1-8]$/i.test(maybeDisamb)) {
        disamb = ` depuis ${speakSquare(maybeDisamb)}`;
      }
    }
  } else {
    const sq = s.match(/[a-h][1-8]/i);
    dest = sq?.[0] ?? s;
  }

  const destSpoken = dest ? speakSquare(dest) : "";
  const verb = capture ? "prend sur" : "en";
  return `${piece}${disamb} ${verb} ${destSpoken}${promo}${check}`.replace(/\s+/g, " ").trim();
}

/** Remplace les SAN isolés dans une phrase par leur forme orale. */
export function expandChessNotationForSpeech(text: string): string {
  return text.replace(
    /\b(?:O-O-O|O-O|0-0-0|0-0|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g,
    (match) => sanToSpokenFrench(match)
  );
}

export function normalizeSpeechText(text: string, maxTotal = 1200): string {
  let cleaned = text.replace(/\s+/g, " ").trim();
  cleaned = expandChessNotationForSpeech(cleaned);
  // Pauses naturelles pour le TTS
  cleaned = cleaned
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\s*\.\.\.\s*/g, "… ")
    .replace(/\s*!+\s*/g, "! ")
    .replace(/\s*\?+\s*/g, "? ")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Phrases un peu plus « parlées » : virgules → micro-pauses
  cleaned = cleaned.replace(/([.!?])\s+/g, "$1 ");
  return cleaned.slice(0, maxTotal);
}

/** Découpe un texte long en phrases pour TTS séquentiel. */
export function splitSpeechChunks(text: string, maxLen = 220): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const parts = cleaned.split(/(?<=[.!?…])\s+/).filter(Boolean);
  if (parts.length <= 1 && cleaned.length > maxLen) {
    const chunks: string[] = [];
    for (let i = 0; i < cleaned.length; i += maxLen) {
      chunks.push(cleaned.slice(i, i + maxLen).trim());
    }
    return chunks.filter(Boolean);
  }
  const chunks: string[] = [];
  let current = "";

  for (const raw of parts.length ? parts : [cleaned]) {
    const part = raw.trim();
    if (!part) continue;
    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (part.length <= maxLen) {
      current = part;
    } else {
      for (let i = 0; i < part.length; i += maxLen) {
        chunks.push(part.slice(i, i + maxLen).trim());
      }
      current = "";
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}
