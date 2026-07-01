"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

export function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <p className={clsx("text-sm opacity-50 py-6 text-center", className)} role="status">
      {children}
    </p>
  );
}
