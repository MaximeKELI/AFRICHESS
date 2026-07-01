"use client";

import Link from "next/link";
import type { LegalDocument } from "@/content/legal/types";

interface LegalDocumentViewProps {
  doc: LegalDocument;
  backLabel: string;
  tocLabel: string;
}

export function LegalDocumentView({ doc, backLabel, tocLabel }: LegalDocumentViewProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-16">
      <Link href="/" className="text-sm text-africhess-green hover:underline">
        ← {backLabel}
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold">{doc.title}</h1>
        <p className="text-sm opacity-60 mt-3">
          {doc.updated} · v{doc.version}
        </p>
        <p className="mt-4 text-sm leading-relaxed opacity-80">{doc.intro}</p>
      </header>

      <nav className="glass-card p-5 mb-10" aria-label={tocLabel}>
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-3">{tocLabel}</h2>
        <ol className="space-y-1.5 text-sm columns-1 md:columns-2 gap-x-8">
          {doc.sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-africhess-green hover:underline">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="space-y-10">
        {doc.sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-4">
              {index + 1}. {section.title}
            </h2>
            <div className="space-y-4 text-sm leading-relaxed opacity-90">
              {section.blocks.map((block, blockIndex) => {
                if (block.type === "p") {
                  return <p key={blockIndex}>{block.text}</p>;
                }
                if (block.type === "h3") {
                  return (
                    <h3 key={blockIndex} className="font-semibold text-base opacity-95 pt-1">
                      {block.text}
                    </h3>
                  );
                }
                if (block.type === "ul") {
                  return (
                    <ul key={blockIndex} className="list-disc pl-5 space-y-1.5">
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <div key={blockIndex} className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm border-collapse">
                      <thead>
                        <tr>
                          {block.headers.map((header) => (
                            <th
                              key={header}
                              className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border border-white/10 px-3 py-2 align-top">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
