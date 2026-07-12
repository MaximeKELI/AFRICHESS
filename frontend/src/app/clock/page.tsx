"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";

type Side = "white" | "black";

const PRESETS = [
  { label: "1+0", base: 60, inc: 0 },
  { label: "3+0", base: 180, inc: 0 },
  { label: "3+2", base: 180, inc: 2 },
  { label: "5+0", base: 300, inc: 0 },
  { label: "5+3", base: 300, inc: 3 },
  { label: "10+0", base: 600, inc: 0 },
  { label: "15+10", base: 900, inc: 10 },
] as const;

function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ClockPage() {
  const { t } = useTranslation();
  const [baseSec, setBaseSec] = useState(180);
  const [incSec, setIncSec] = useState(2);
  const [times, setTimes] = useState({ white: 180_000, black: 180_000 });
  const [active, setActive] = useState<Side | null>(null);
  const [running, setRunning] = useState(false);
  const lastTick = useRef<number>(0);

  const reset = useCallback((base = baseSec, inc = incSec) => {
    setBaseSec(base);
    setIncSec(inc);
    setTimes({ white: base * 1000, black: base * 1000 });
    setActive(null);
    setRunning(false);
  }, [baseSec, incSec]);

  useEffect(() => {
    if (!running || !active) return;
    lastTick.current = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = now - lastTick.current;
      lastTick.current = now;
      setTimes((prev) => {
        const next = { ...prev, [active]: prev[active] - dt };
        if (next[active] <= 0) {
          next[active] = 0;
          setRunning(false);
          setActive(null);
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, active]);

  const press = (side: Side) => {
    if (times.white <= 0 || times.black <= 0) return;
    if (!running || active === null) {
      setActive(side === "white" ? "black" : "white");
      setRunning(true);
      return;
    }
    if (active !== side) return;
    setTimes((prev) => ({
      ...prev,
      [side]: prev[side] + incSec * 1000,
    }));
    setActive(side === "white" ? "black" : "white");
  };

  const ClockFace = ({ side }: { side: Side }) => {
    const ms = times[side];
    const isActive = running && active === side;
    const flagged = ms <= 0;
    return (
      <button
        type="button"
        onClick={() => press(side)}
        className={clsx(
          "w-full rounded-2xl p-8 md:p-12 text-center transition-colors select-none",
          flagged && "bg-africhess-terracotta/40",
          isActive && !flagged && "bg-africhess-green/30 ring-2 ring-africhess-green",
          !isActive && !flagged && "bg-white/5 hover:bg-white/10"
        )}
      >
        <p className="text-sm uppercase tracking-wider opacity-60 mb-2">
          {side === "white" ? t("editor.white") : t("editor.black")}
        </p>
        <p className={clsx("font-mono text-5xl md:text-7xl tabular-nums", isActive && "text-africhess-gold")}>
          {formatMs(ms)}
        </p>
      </button>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link href="/tools" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.group.tools")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("clock.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("clock.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => reset(p.base, p.inc)}
            className={clsx(
              "px-3 py-1.5 text-sm rounded-lg border",
              baseSec === p.base && incSec === p.inc
                ? "border-africhess-gold bg-africhess-gold/10"
                : "hover:bg-white/10"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <ClockFace side="black" />
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            disabled={!active}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-white/10 disabled:opacity-40"
          >
            {running ? t("clock.pause") : t("clock.resume")}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-white/10"
          >
            {t("clock.reset")}
          </button>
        </div>
        <ClockFace side="white" />
      </div>

      <p className="text-xs opacity-50 text-center">{t("clock.hint")}</p>
    </div>
  );
}
