"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getBoardBackground } from "@/lib/boardBackgrounds";
import { shouldShowSiteBackground } from "@/lib/siteBackgroundRoutes";
import { usePreferencesStore } from "@/store/preferences";

/** Arrière-plan plein écran — uniquement sur Jouer, Problèmes, Profil (pas l'accueil). */
export function SiteBackground() {
  const pathname = usePathname();
  const boardBackgroundId = usePreferencesStore((s) => s.boardBackground);
  const bg = getBoardBackground(boardBackgroundId);
  const onAllowedPage = shouldShowSiteBackground(pathname);
  const active = onAllowedPage && Boolean(bg.src);

  useEffect(() => {
    document.documentElement.classList.toggle("has-site-background", active);
    return () => document.documentElement.classList.remove("has-site-background");
  }, [active]);

  if (!active) return null;

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
