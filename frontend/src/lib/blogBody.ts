/** Parse le corps d'un article blog avec diagrammes FEN intégrés */

export type BlogSegment =
  | { type: "text"; content: string }
  | { type: "diagram"; fen: string };

const DIAGRAM_RE = /\[diagram:([^\]]+)\]/g;

/** Découpe le texte en segments texte / diagramme */
export function parseBlogBody(body: string): BlogSegment[] {
  const segments: BlogSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(DIAGRAM_RE.source, "g");
  while ((match = re.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: body.slice(lastIndex, match.index) });
    }
    segments.push({ type: "diagram", fen: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ type: "text", content: body.slice(lastIndex) });
  }

  if (segments.length === 0 && body) {
    segments.push({ type: "text", content: body });
  }

  return segments;
}

/** Insère un marqueur diagramme à la fin du texte */
export function insertDiagramMarker(body: string, fen: string): string {
  const marker = `[diagram:${fen.trim()}]`;
  return body.trim() ? `${body.trim()}\n\n${marker}` : marker;
}
