"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Menu, Play, Puzzle, Radio } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";

const TABS = [
  { href: "/play", key: "nav.play", icon: Play, match: (p: string) => p.startsWith("/play") },
  { href: "/puzzles", key: "nav.puzzles", icon: Puzzle, match: (p: string) => p.startsWith("/puzzles") },
  { href: "/learning", key: "nav.learn", icon: BookOpen, match: (p: string) => p.startsWith("/learning") || p.startsWith("/insights") || p.startsWith("/coaches") || p.startsWith("/classroom") },
  { href: "/live", key: "nav.live", icon: Radio, match: (p: string) => p.startsWith("/live") },
] as const;

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

export function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[var(--card)]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
      aria-label={t("nav.mobileTabs")}
    >
      <div className="grid grid-cols-5 h-14">
        {TABS.map(({ href, key, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-africhess-gold" : "text-[var(--text)]/60 hover:text-africhess-gold"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate max-w-full px-1">{t(key)}</span>
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
