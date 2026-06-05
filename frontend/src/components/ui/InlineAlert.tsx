"use client";

import clsx from "clsx";

interface InlineAlertProps {
  variant?: "error" | "info";
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}

export function InlineAlert({
  variant = "error",
  children,
  className,
  onDismiss,
}: InlineAlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "text-sm rounded-lg px-3 py-2 flex items-start justify-between gap-2",
        variant === "error"
          ? "text-africhess-terracotta bg-africhess-terracotta/10 border border-africhess-terracotta/30"
          : "text-africhess-gold bg-africhess-gold/10 border border-africhess-gold/30",
        className
      )}
    >
      <span>{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="opacity-60 hover:opacity-100 shrink-0"
          aria-label="Fermer"
        >
          ×
        </button>
      )}
    </div>
  );
}
