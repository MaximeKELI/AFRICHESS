"use client";

import type { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = "Aucune donnée.",
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  caption?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm opacity-50 py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        {caption && (
          <caption className="text-left text-xs opacity-50 px-4 py-2 caption-top">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="bg-white/5 text-left text-xs uppercase tracking-wide opacity-60">
            {columns.map((col) => (
              <th key={String(col.key)} className={`px-4 py-3 font-medium ${col.className ?? ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-white/5 hover:bg-white/5 transition-colors"
            >
              {columns.map((col) => (
                <td key={String(col.key)} className={`px-4 py-2.5 ${col.className ?? ""}`}>
                  {col.render
                    ? col.render(row)
                    : String(row[col.key as keyof T] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
