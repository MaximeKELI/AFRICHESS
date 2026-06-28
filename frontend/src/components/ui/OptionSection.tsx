"use client";

import clsx from "clsx";

export interface OptionSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Contenu plus compact (panneau latéral play/puzzles) */
  compact?: boolean;
}

export function OptionSection({
  title,
  description,
  children,
  className,
  compact = false,
}: OptionSectionProps) {
  return (
    <section
      className={clsx(
        "rounded-xl border border-white/10 bg-black/25 backdrop-blur-sm",
        compact ? "p-3 space-y-2.5" : "p-4 sm:p-5 space-y-3",
        className
      )}
      aria-labelledby={`option-section-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <header className="border-b border-white/10 pb-2.5">
        <h3
          id={`option-section-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className={clsx("font-semibold text-africhess-gold", compact ? "text-sm" : "text-base")}
        >
          {title}
        </h3>
        {description && (
          <p className={clsx("opacity-55 mt-1", compact ? "text-[11px]" : "text-xs")}>
            {description}
          </p>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}
