"use client";

import { useEffect } from "react";
import { getBoardBackground } from "@/lib/boardBackgrounds";
import { usePreferencesStore } from "@/store/preferences";

/** Arrière-plan plein écran (style Chess.com) — tout le site, pas seulement l'échiquier. */
export function SiteBackground() {
  const boardBackgroundId = usePreferencesStore((s) => s.boardBackground);
  const bg = getBoardBackground(boardBackgroundId);
  const active = Boolean(bg.src);

  useEffect(() => {
    document.documentElement.classList.toggle("has-site-background", active);
    return () => document.documentElement.classList.remove("has-site-background");
  }, [active]);

  if (!bg.src) return null;

  return (
    <div className="site-background" aria-hidden>
      <div
        className="site-background-image"
        style={{ backgroundImage: `url('${bg.src}')` }}
      />
      <div className="site-background-overlay" />
    </div>
  );
}
