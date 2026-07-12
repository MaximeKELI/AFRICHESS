"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Menu, Play, Puzzle, Radio, Users } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";
import { isImmersiveRoute } from "@/lib/immersiveRoutes";

const TABS = [
  { href: "/play", key: "nav.play", icon: Play, match: (p: string) => p.startsWith("/play") },
  { href: "/puzzles", key: "nav.puzzles", icon: Puzzle, match: (p: string) => p.startsWith("/puzzles") },
  { href: "/learning", key: "nav.learn", icon: BookOpen, match: (p: string) =>
    p.startsWith("/learning") ||
    p.startsWith("/learn") ||
    p.startsWith("/practice") ||
    p.startsWith("/studies") ||
    p.startsWith("/training") ||
    p.startsWith("/insights") ||
    p.startsWith("/coaches") ||
    p.startsWith("/classroom"),
  },
  {
    href: "/tv",
    key: "nav.watch",
    icon: Radio,
    match: (p: string) =>
      p.startsWith("/tv") ||
      p.startsWith("/live") ||
      p.startsWith("/watch") ||
      p.startsWith("/broadcasts"),
  },
  {
    href: "/community",
    key: "nav.community",
    icon: Users,
    match: (p: string) =>
      p.startsWith("/community") ||
      p.startsWith("/forum") ||
      p.startsWith("/friends") ||
      p.startsWith("/players") ||
      p.startsWith("/teams") ||
      p.startsWith("/clubs") ||
      p.startsWith("/blog") ||
      p.startsWith("/streamers"),
  },
] as const;

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

export function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (isImmersiveRoute(pathname)) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-layer-nav border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-xl shadow-[0_-8px_32px_rgb(0_0_0/0.08)] pb-[env(safe-area-inset-bottom)]"
      aria-label={t("nav.mobileTabs")}
    >
      <div className="grid grid-cols-6 h-14">
        {TABS.map(({ href, key, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-200",
                active ? "text-africhess-gold" : "text-muted hover:text-africhess-gold"
              )}
            >
              {active && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-africhess-gold" aria-hidden />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate max-w-full px-0.5">{t(key)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[var(--text)]/60 hover:text-africhess-gold"
          aria-label={t("nav.menu.open")}
        >
          <Menu size={20} />
          <span>{t("nav.more")}</span>
        </button>
      </div>
    </nav>
  );
}
