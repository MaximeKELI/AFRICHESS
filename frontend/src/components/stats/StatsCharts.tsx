"use client";

interface Slice {
  label: string;
  value: number;
  color: string;
}

const CHART_COLORS = {
  win: "#2d6a4f",
  draw: "#6b7280",
  loss: "#c45c3e",
  gold: "#d4a843",
  green: "#2d6a4f",
  terracotta: "#c45c3e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
};

/** Diagramme en anneau (répartition V/N/D). */
export function DonutChart({
  slices,
  size = 160,
  centerLabel,
  centerSub,
}: {
  slices: Slice[];
  size?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;

  const arcs = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const pct = slice.value / total;
      const sweep = pct * 360;
      const start = angle;
      angle += sweep;
      const x1 = cx + r * Math.cos((Math.PI * start) / 180);
      const y1 = cy + r * Math.sin((Math.PI * start) / 180);
      const x2 = cx + r * Math.cos((Math.PI * (start + sweep)) / 180);
      const y2 = cy + r * Math.sin((Math.PI * (start + sweep)) / 180);
      const large = sweep > 180 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { ...slice, d, pct };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {arcs.map((a) => (
          <path key={a.label} d={a.d} fill={a.color} opacity={0.9} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--card)" />
        {centerLabel && (
          <text
            x={cx}
            y={centerSub ? cy - 4 : cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-lg font-bold"
            fontSize="18"
            fontWeight="bold"
          >
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current opacity-50"
            fontSize="10"
          >
            {centerSub}
          </text>
        )}
      </svg>
      <div className="space-y-2 text-sm min-w-[140px]">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 opacity-80">{s.label}</span>
            <span className="font-mono text-xs">
              {s.value} ({Math.round((s.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barres verticales groupées ou simples. */
export function BarChart({
  items,
  maxHeight = 140,
  color = CHART_COLORS.gold,
}: {
  items: { label: string; value: number; color?: string }[];
  maxHeight?: number;
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height: maxHeight }}>
        {items.map((item) => {
          const h = Math.max(4, (item.value / max) * maxHeight);
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[10px] font-mono opacity-60">{item.value}</span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: h,
                  background: item.color ?? color,
                  opacity: 0.85,
                }}
                title={`${item.label}: ${item.value}`}
              />
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

/** Barres horizontales (ouvertures, terminaisons). */
export function HorizontalBarChart({
  items,
  maxWidth = 100,
}: {
  items: { label: string; value: number; sub?: string; color?: string }[];
  maxWidth?: number;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
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
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / max) * maxWidth}%`,
                background: item.color ?? CHART_COLORS.gold,
                minWidth: item.value ? "4px" : 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Courbe ELO (historique). */
export function LineChart({
  points,
  height = 120,
  color = CHART_COLORS.green,
}: {
  points: { x: string; y: number; label?: string }[];
  height?: number;
  color?: string;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm opacity-50 py-8 text-center">
        Pas assez de données pour le graphique ELO.
      </p>
    );
  }

  const width = 400;
  const pad = { t: 12, r: 12, b: 28, l: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys) - 20;
  const maxY = Math.max(...ys) + 20;
  const spanY = maxY - minY || 1;

  const coords = points.map((p, i) => ({
    ...p,
    px: pad.l + (i / (points.length - 1)) * innerW,
    py: pad.t + innerH - ((p.y - minY) / spanY) * innerH,
  }));

  const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.px} ${c.py}`).join(" ");
  const areaD = `${lineD} L ${coords[coords.length - 1].px} ${pad.t + innerH} L ${coords[0].px} ${pad.t + innerH} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        const val = Math.round(minY + spanY * t);
        return (
          <g key={t}>
            <line
              x1={pad.l}
              y1={y}
              x2={width - pad.r}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text x={4} y={y + 4} fontSize="9" fill="currentColor" opacity={0.4}>
              {val}
            </text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#eloGrad)" />
      <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.px}
          cy={c.py}
          r={3}
          fill={color}
          opacity={i === coords.length - 1 ? 1 : 0.6}
        >
          <title>{`${c.x}: ${c.y}`}</title>
        </circle>
      ))}
      <text
        x={coords[coords.length - 1].px}
        y={coords[coords.length - 1].py - 8}
        textAnchor="middle"
        fontSize="10"
        fill={color}
        fontWeight="bold"
      >
        {coords[coords.length - 1].y}
      </text>
    </svg>
  );
}

/** Sparkline forme récente (V/D/N). */
export function FormSparkline({
  outcomes,
}: {
  outcomes: ("win" | "loss" | "draw" | string)[];
}) {
  const colors: Record<string, string> = {
    win: CHART_COLORS.win,
    loss: CHART_COLORS.loss,
    draw: CHART_COLORS.draw,
  };
  const labels: Record<string, string> = { win: "V", loss: "D", draw: "N" };

  return (
    <div className="flex gap-1 flex-wrap">
      {outcomes.map((o, i) => (
        <div
          key={i}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
          style={{
            background: `${colors[o] ?? "#666"}33`,
            color: colors[o] ?? "#999",
          }}
          title={o}
        >
          {labels[o] ?? "?"}
        </div>
      ))}
    </div>
  );
}

export { CHART_COLORS };
