"use client";

import clsx from "clsx";

interface AccuracyGaugeProps {
  value: number | null | undefined;
  label: string;
  sublabel?: string;
  highlight?: boolean;
  size?: number;
  variant?: "gold" | "muted";
}

export function AccuracyGauge({
  value,
  label,
  sublabel,
  highlight = false,
  size = 96,
  variant = "gold",
}: AccuracyGaugeProps) {
  const pct = value != null && !Number.isNaN(value) ? Math.max(0, Math.min(100, value)) : null;
  const stroke = 7;
  const r = (size - stroke) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = pct != null ? circumference - (pct / 100) * circumference : circumference;

  const ringColor =
    variant === "gold"
      ? highlight
        ? "#D4A017"
        : "rgba(212,160,23,0.55)"
      : highlight
        ? "rgba(255,255,255,0.75)"
        : "rgba(255,255,255,0.35)";

  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-1.5 min-w-0",
        highlight && "scale-[1.02]"
      )}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {pct != null && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={clsx(
              "font-bold tabular-nums leading-none",
              highlight ? "text-africhess-gold text-xl" : "text-white/90 text-lg"
            )}
          >
            {pct != null ? `${pct.toFixed(1)}` : "—"}
          </span>
          {pct != null && (
            <span className="text-[9px] opacity-40 mt-0.5">%</span>
          )}
        </div>
      </div>
      <div className="text-center min-w-0">
        <p
          className={clsx(
            "text-[10px] uppercase tracking-wider truncate max-w-[5.5rem]",
            highlight ? "text-africhess-gold font-semibold" : "opacity-50"
          )}
        >
          {label}
        </p>
        {sublabel && (
          <p className="text-[9px] opacity-35 truncate max-w-[5.5rem]">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

interface AccuracyCompareBarProps {
  left: number | null;
  right: number | null;
  leftLabel: string;
  rightLabel: string;
}

/** Barre de comparaison horizontale entre deux scores. */
export function AccuracyCompareBar({
  left,
  right,
  leftLabel,
  rightLabel,
}: AccuracyCompareBarProps) {
  const l = left ?? 0;
  const r = right ?? 0;
  const total = l + r || 1;
  const leftPct = (l / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10">
        <div
          className="h-full bg-gradient-to-r from-white/80 to-white/50 transition-all duration-700"
          style={{ width: `${leftPct}%` }}
        />
        <div
          className="h-full bg-gradient-to-l from-africhess-gold to-africhess-gold/60 transition-all duration-700"
          style={{ width: `${100 - leftPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums">
        <span className="opacity-60">
          {leftLabel}{" "}
          <span className="font-semibold text-white/90">
            {left != null ? `${left.toFixed(1)}%` : "—"}
          </span>
        </span>
        <span className="opacity-60 text-right">
          {rightLabel}{" "}
          <span className="font-semibold text-africhess-gold">
            {right != null ? `${right.toFixed(1)}%` : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}
