"use client";

import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";

interface LoadingStateProps {
  className?: string;
  label?: string;
}

export function LoadingState({ className, label }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx("flex flex-col items-center justify-center gap-3 py-12", className)}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-africhess-gold/30 border-t-africhess-gold animate-spin"
        aria-hidden
      />
      <p className="text-sm opacity-60">{label ?? t("common.loading")}</p>
    </div>
  );
}
