"use client";

import { useMemo } from "react";
import { MiniBoard } from "./MiniBoard";

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function renderBlock(text: string, key: number) {
  const fenMatch = text.match(/\[fen:([^\]]+)\]/);
  if (fenMatch) {
    return <MiniBoard key={key} fen={fenMatch[1]} />;
  }
  if (text.startsWith("### ")) {
    return (
      <h4 key={key} className="font-semibold mt-4 mb-2 text-africhess-gold">
        {text.slice(4)}
      </h4>
    );
  }
  if (text.startsWith("## ")) {
    return (
      <h3 key={key} className="font-semibold text-lg mt-6 mb-2">
        {text.slice(3)}
      </h3>
    );
  }
  if (text.startsWith("# ")) {
    return (
      <h2 key={key} className="font-display text-xl font-bold mt-6 mb-3">
        {text.slice(2)}
      </h2>
    );
  }
  if (text.startsWith("- ")) {
    return (
      <li key={key} className="ml-4 list-disc opacity-90">
        {text.slice(2)}
      </li>
    );
  }
  return (
    <p key={key} className="mb-3 leading-relaxed opacity-90">
      {text}
    </p>
  );
}

export function LessonReader({ content, title }: { content: string; title: string }) {
  const words = useMemo(() => wordCount(content), [content]);
  const minutes = Math.max(1, Math.ceil(words / 200));
  const pages = Math.ceil(words / 300);

  const headings = useMemo(() => {
    return content
      .split("\n")
      .filter((l) => l.startsWith("## "))
      .map((l) => l.replace(/^##\s+/, "").trim());
  }, [content]);

  const blocks = useMemo(() => {
    return content.split("\n\n").map((b) => b.trim()).filter(Boolean);
  }, [content]);

  return (
    <div>
      <p className="text-xs opacity-60 mb-4">
        ~{words.toLocaleString("fr-FR")} mots · {pages} pages · {minutes} min
      </p>
      {headings.length > 3 && (
        <nav className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10 text-sm max-h-48 overflow-y-auto">
          <p className="font-semibold mb-2">Sommaire — {title}</p>
          <ul className="space-y-1 opacity-70">
            {headings.slice(0, 24).map((h) => (
              <li key={h}>· {h}</li>
            ))}
          </ul>
        </nav>
      )}
      <article className="prose prose-invert max-w-none text-sm">
        {blocks.map((block, i) => renderBlock(block, i))}
      </article>
    </div>
  );
}
