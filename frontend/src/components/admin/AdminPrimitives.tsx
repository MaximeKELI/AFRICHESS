"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function AdminSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-xl bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

export function AdminPanel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] overflow-hidden",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <div className="min-w-0">
            {title && <h2 className="font-semibold text-sm sm:text-base truncate">{title}</h2>}
            {subtitle && <p className="text-xs opacity-55 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={clsx("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function AdminKpi({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "warn" | "danger" | "ok";
  href?: string;
}) {
  const toneRing =
    tone === "warn"
      ? "border-amber-500/35"
      : tone === "danger"
        ? "border-red-500/35"
        : tone === "ok"
          ? "border-emerald-500/35"
          : "border-[var(--border-subtle)]";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-wide opacity-55 leading-tight">{label}</p>
        {Icon && (
          <span className="opacity-40 shrink-0">
            <Icon size={16} aria-hidden />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums text-africhess-gold leading-none">{value}</p>
      {sub != null && sub !== "" && <p className="text-xs opacity-50 mt-2 leading-snug">{sub}</p>}
    </>
  );

  const className = clsx(
    "rounded-2xl border bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-4 h-full",
    toneRing,
    href && "transition-colors hover:border-africhess-gold/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-africhess-gold/50"
  );

  if (href) {
    if (href.startsWith("http")) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "gold";
}) {
  const tones = {
    neutral: "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]",
    ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    danger: "bg-red-500/15 text-red-600 dark:text-red-400",
    info: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    gold: "bg-africhess-gold/15 text-africhess-gold",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-sm opacity-55 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center text-sm opacity-55 border border-dashed border-[var(--border-subtle)] rounded-xl">
      {children}
    </div>
  );
}

export function AdminMetaGrid({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide opacity-45 mb-0.5">{item.label}</dt>
          <dd className="font-medium truncate">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
