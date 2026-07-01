"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { CHART_COLORS } from "@/components/stats/StatsCharts";

export function FuturisticPanel({
  title,
  subtitle,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className={`stats-fx-panel ${inView ? "stats-fx-panel-visible" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stats-fx-panel-grid" aria-hidden />
      <div className="stats-fx-panel-glow" aria-hidden />
      <header className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-wide text-white/95">{title}</h2>
          {subtitle && <p className="text-xs text-white/45 mt-0.5">{subtitle}</p>}
        </div>
        <span className="stats-fx-live-dot shrink-0" title="Live" />
      </header>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function AnimatedStatCard({
  label,
  value,
  sub,
  accent = "gold",
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "gold" | "green" | "cyan";
  delay?: number;
}) {
  const { ref, inView } = useInView();
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+(\.\d+)?%?$/.test(value.trim())
        ? parseFloat(value)
        : null;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || numeric == null) return;
    const target = numeric;
    const start = performance.now();
    const duration = 1100;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, numeric]);

  const accentClass =
    accent === "green"
      ? "stats-fx-accent-green"
      : accent === "cyan"
        ? "stats-fx-accent-cyan"
        : "stats-fx-accent-gold";

  const shown =
    numeric != null && inView
      ? `${display}${typeof value === "string" && value.includes("%") ? "%" : ""}`
      : value;

  return (
    <div
      ref={ref}
      className={`stats-fx-stat ${accentClass} ${inView ? "stats-fx-stat-visible" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="stats-fx-stat-value">{shown}</p>
      <p className="stats-fx-stat-label">{label}</p>
      {sub && <p className="stats-fx-stat-sub">{sub}</p>}
    </div>
  );
}

interface Slice {
  label: string;
  value: number;
  color: string;
}

export function NeonDonutChart({
  slices,
  centerLabel,
  centerSub,
  size = 180,
}: {
  slices: Slice[];
  centerLabel?: string;
  centerSub?: string;
  size?: number;
}) {
  const { ref, inView } = useInView();
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const arcs = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const pct = slice.value / total;
      const len = pct * circumference;
      const dash = `${len} ${circumference - len}`;
      const rot = (offset / circumference) * 360 - 90;
      offset += len;
      return { ...slice, dash, rot, pct };
    });

  return (
    <div ref={ref} className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {arcs.map((a, i) => (
            <circle
              key={a.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={a.dash}
              transform={`rotate(${a.rot} ${cx} ${cy})`}
              className={inView ? "stats-fx-donut-segment" : ""}
              style={{
                animationDelay: `${i * 120}ms`,
                filter: `drop-shadow(0 0 6px ${a.color}88)`,
              }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && (
            <span className="text-2xl font-bold font-mono text-africhess-gold stats-fx-glow-text">
              {centerLabel}
            </span>
          )}
          {centerSub && <span className="text-[10px] uppercase tracking-widest opacity-50">{centerSub}</span>}
        </div>
      </div>
      <div className="space-y-2.5 text-sm min-w-[150px] w-full">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-2 stats-fx-legend-row ${inView ? "stats-fx-legend-visible" : ""}`}
            style={{ animationDelay: `${200 + i * 80}ms` }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 stats-fx-legend-dot"
              style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
            />
            <span className="flex-1 opacity-80 truncate">{s.label}</span>
            <span className="font-mono text-xs opacity-70">
              {s.value} ({Math.round((s.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NeonBarChart({
  items,
  maxHeight = 140,
}: {
  items: { label: string; value: number; color?: string }[];
  maxHeight?: number;
}) {
  const { ref, inView } = useInView();
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height: maxHeight }}>
        {items.map((item, i) => {
          const pct = (item.value / max) * 100;
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono text-africhess-gold/80">{item.value}</span>
              <div
                className="w-full rounded-t-md stats-fx-bar-track relative overflow-hidden"
                style={{ height: maxHeight - 24 }}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-md stats-fx-bar-fill ${inView ? "stats-fx-bar-animate" : ""}`}
                  style={{
                    height: inView ? `${Math.max(pct, item.value ? 6 : 0)}%` : "0%",
                    background: `linear-gradient(180deg, ${item.color ?? CHART_COLORS.gold} 0%, ${item.color ?? CHART_COLORS.gold}66 100%)`,
                    boxShadow: `0 0 16px ${item.color ?? CHART_COLORS.gold}55`,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 mt-2">
        {items.map((item) => (
          <span
            key={item.label}
            className="flex-1 text-[10px] text-center opacity-50 capitalize truncate"
            title={item.label}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NeonLineChart({
  points,
  height = 160,
  color = "#2d6a4f",
}: {
  points: { x: string; y: number }[];
  height?: number;
  color?: string;
}) {
  const { ref, inView } = useInView();
  const gradId = useId().replace(/:/g, "");

  if (points.length < 2) {
    return <p className="text-sm opacity-50 py-8 text-center">—</p>;
  }

  const width = 480;
  const pad = { t: 16, r: 16, b: 32, l: 40 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys) - 25;
  const maxY = Math.max(...ys) + 25;
  const spanY = maxY - minY || 1;

  const coords = points.map((p, i) => ({
    ...p,
    px: pad.l + (i / (points.length - 1)) * innerW,
    py: pad.t + innerH - ((p.y - minY) / spanY) * innerH,
  }));

  const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.px} ${c.py}`).join(" ");
  const areaD = `${lineD} L ${coords[coords.length - 1].px} ${pad.t + innerH} L ${coords[0].px} ${pad.t + innerH} Z`;

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`${gradId}-glow`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          const val = Math.round(minY + spanY * t);
          return (
            <g key={t}>
              <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={6} y={y + 4} fontSize="9" fill="rgba(255,255,255,0.35)">
                {val}
              </text>
            </g>
          );
        })}
        <path d={areaD} fill={`url(#${gradId})`} className={inView ? "stats-fx-area-fade" : ""} opacity={inView ? 1 : 0} />
        <path
          d={lineD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          filter={`url(#${gradId}-glow)`}
          className={inView ? "stats-fx-line-draw" : ""}
          pathLength={1}
          strokeDasharray={inView ? undefined : "1"}
          strokeDashoffset={inView ? undefined : 1}
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.px}
            cy={c.py}
            r={i === coords.length - 1 ? 5 : 3}
            fill={color}
            className={inView ? "stats-fx-point-pop" : ""}
            style={{ animationDelay: `${300 + i * 60}ms` }}
          >
            <title>{`${c.x}: ${c.y}`}</title>
          </circle>
        ))}
        <text
          x={coords[coords.length - 1].px}
          y={coords[coords.length - 1].py - 10}
          textAnchor="middle"
          fontSize="11"
          fill={color}
          fontWeight="bold"
        >
          {coords[coords.length - 1].y}
        </text>
      </svg>
    </div>
  );
}

export function ActivityPulseChart({
  items,
  maxHeight = 100,
}: {
  items: { label: string; value: number }[];
  maxHeight?: number;
}) {
  const { ref, inView } = useInView();
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div ref={ref} className="flex items-end gap-[3px] h-[100px]">
      {items.map((item, i) => {
        const h = Math.max(3, (item.value / max) * maxHeight);
        return (
          <div
            key={`${item.label}-${i}`}
            className="flex-1 min-w-0 group relative"
            title={`${item.label}: ${item.value}`}
          >
            <div
              className={`w-full rounded-sm stats-fx-activity-bar ${inView ? "stats-fx-bar-animate" : ""}`}
              style={{
                height: inView ? h : 0,
                background:
                  item.value > 0
                    ? "linear-gradient(180deg, #d4a843 0%, #1b7a3d88 100%)"
                    : "rgba(255,255,255,0.04)",
                boxShadow: item.value > 0 ? "0 0 10px #d4a84344" : undefined,
                transitionDelay: `${i * 25}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function FormTimeline({ outcomes }: { outcomes: string[] }) {
  const { ref, inView } = useInView();
  const colors: Record<string, string> = {
    win: CHART_COLORS.win,
    loss: CHART_COLORS.loss,
    draw: CHART_COLORS.draw,
  };
  const labels: Record<string, string> = { win: "V", loss: "D", draw: "N" };

  return (
    <div ref={ref} className="flex gap-1.5 flex-wrap">
      {outcomes.map((o, i) => (
        <div
          key={i}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold stats-fx-form-cell ${inView ? "stats-fx-form-pop" : ""}`}
          style={{
            animationDelay: `${i * 45}ms`,
            background: `${colors[o] ?? "#666"}22`,
            color: colors[o] ?? "#999",
            boxShadow: `0 0 12px ${colors[o] ?? "#666"}33`,
            border: `1px solid ${colors[o] ?? "#666"}44`,
          }}
          title={o}
        >
          {labels[o] ?? "?"}
        </div>
      ))}
    </div>
  );
}

export function WinRateGauge({ value }: { value: number }) {
  const { ref, inView } = useInView();
  const pct = Math.min(100, Math.max(0, value));
  const angle = (pct / 100) * 180;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251} 251`}
          className={inView ? "stats-fx-gauge-fill" : ""}
          style={{ filter: "drop-shadow(0 0 8px #2d6a4f88)" }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1b7a3d" />
            <stop offset="100%" stopColor="#d4a843" />
          </linearGradient>
        </defs>
        <text x="100" y="88" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#d4a843">
          {inView ? `${pct}%` : "0%"}
        </text>
      </svg>
    </div>
  );
}

export function NeonHorizontalBars({
  items,
}: {
  items: { label: string; value: number; sub?: string; color?: string }[];
}) {
  const { ref, inView } = useInView();
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div ref={ref} className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="truncate opacity-80">{item.label}</span>
            <span className="font-mono shrink-0 opacity-60">
              {item.value}
              {item.sub ? ` · ${item.sub}` : ""}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full stats-fx-hbar ${inView ? "stats-fx-hbar-animate" : ""}`}
              style={{
                width: inView ? `${(item.value / max) * 100}%` : "0%",
                background: `linear-gradient(90deg, ${item.color ?? CHART_COLORS.gold}88, ${item.color ?? CHART_COLORS.gold})`,
                boxShadow: `0 0 10px ${item.color ?? CHART_COLORS.gold}55`,
                transitionDelay: `${i * 90}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
