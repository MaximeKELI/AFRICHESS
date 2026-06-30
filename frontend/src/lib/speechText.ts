/** Découpe un texte long en phrases pour TTS séquentiel. */
export function splitSpeechChunks(text: string, maxLen = 240): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const parts = cleaned.split(/(?<=[.!?…])\s+/u).filter(Boolean);
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

export function normalizeSpeechText(text: string, maxTotal = 1200): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxTotal);
}
