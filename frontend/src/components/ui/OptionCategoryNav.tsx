"use client";

import clsx from "clsx";

export interface OptionCategory {
  id: string;
  label: string;
}

interface OptionCategoryNavProps {
  categories: OptionCategory[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function OptionCategoryNav({
  categories,
  active,
  onChange,
  className,
  ariaLabel,
}: OptionCategoryNavProps) {
  return (
    <div
      className={clsx("flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {categories.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={clsx(
            "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
            active === id
              ? "bg-africhess-gold/20 text-africhess-gold border border-africhess-gold/40"
              : "border border-white/15 opacity-70 hover:opacity-100"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
