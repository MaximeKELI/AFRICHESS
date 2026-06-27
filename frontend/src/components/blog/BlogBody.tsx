"use client";

import { MiniBoard } from "@/components/learning/MiniBoard";
import { parseBlogBody } from "@/lib/blogBody";

/** Rendu d'un article blog avec diagrammes FEN intégrés */
export function BlogBody({ body }: { body: string }) {
  const segments = parseBlogBody(body);

  return (
    <div className="prose prose-invert max-w-none space-y-4">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <p key={i} className="whitespace-pre-wrap opacity-90 leading-relaxed">
            {seg.content}
          </p>
        ) : (
          <MiniBoard key={i} fen={seg.fen} />
        )
      )}
    </div>
  );
}
