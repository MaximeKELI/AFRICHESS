"use client";

import { useMemo } from "react";

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function readingMinutes(words: number) {
  return Math.max(1, Math.ceil(words / 200));
}

export function LessonReader({ content, title }: { content: string; title: string }) {
  const words = useMemo(() => wordCount(content), [content]);
  const minutes = readingMinutes(words);
  const pages = Math.ceil(words / 300);

  const headings = useMemo(() => {
    const lines = content.split("\n");
    return lines
      .filter((l) => l.startsWith("## "))
      .map((l) => l.replace(/^##\s+/, "").trim());
  }, [content]);

  return (
    <div>
      <p className="text-xs opacity-60 mb-4">
        ~{words.toLocaleString("fr-FR")} mots · {pages} pages estimées · {minutes} min de lecture
      </p>
      {headings.length > 3 && (
        <nav className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10 text-sm max-h-48 overflow-y-auto">
          <p className="font-semibold mb-2 opacity-80">Sommaire — {title}</p>
          <ul className="space-y-1 opacity-70">
            {headings.slice(0, 24).map((h) => (
              <li key={h}>· {h}</li>
            ))}
            {headings.length > 24 && <li>… et {headings.length - 24} sections</li>}
          </ul>
        </nav>
      )}
      <article className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap opacity-90">
        {content}
      </article>
    </div>
  );
}
