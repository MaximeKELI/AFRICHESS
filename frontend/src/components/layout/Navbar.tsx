"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Menu, Moon, Shield, Sun, Wifi, WifiOff, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const NAV_LINKS = [
  { href: "/play", key: "nav.play" },
  { href: "/play/daily", key: "nav.daily" },
  { href: "/learning", key: "nav.learn" },
  { href: "/learning/openings", key: "nav.openings" },
  { href: "/puzzles", key: "nav.puzzles" },
  { href: "/live", key: "nav.live" },
  { href: "/friends", key: "nav.friends" },
  { href: "/clubs", key: "nav.clubs" },
  { href: "/tournaments", key: "nav.tournaments" },
  { href: "/leaderboard", key: "leaderboard.african" },
  { href: "/stats", key: "nav.stats" },
  { href: "/community", key: "nav.community" },
] as const;

export function Navbar() {
  const { user, locale, setLocale, darkMode, toggleDarkMode, lowBandwidth, setLowBandwidth, logout } =
    useAuthStore();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--card)]/90 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" onClick={closeMobile}>
          <Image src="/images/logo.png" alt="AFRICHESS" width={40} height={40} className="rounded-lg" />
          <span className="font-display text-xl font-bold bg-gradient-to-r from-africhess-gold to-africhess-green bg-clip-text text-transparent">
            AFRICHESS
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map(({ href, key }) => (
            <Link key={href} href={href} className="hover:text-africhess-gold transition-colors">
              {t(key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? t("nav.menu.close") : t("nav.menu.open")}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as typeof locale)}
            className="bg-transparent text-sm border border-white/20 rounded-lg px-2 py-1"
            aria-label={t("nav.language")}
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="ar">AR</option>
            <option value="pt">PT</option>
            <option value="sw">SW</option>
          </select>

          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-white/10" aria-label={t("nav.theme")}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setLowBandwidth(!lowBandwidth)}
            className="p-2 rounded-lg hover:bg-white/10"
            title={lowBandwidth ? t("nav.lowBandwidth.on") : t("nav.lowBandwidth.off")}
            aria-label={t("nav.lowBandwidth")}
          >
            {lowBandwidth ? <WifiOff size={18} /> : <Wifi size={18} />}
          </button>

          {user ? (
            <div className="flex items-center gap-3 ml-2">
              {user.is_staff && (
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-1 text-sm text-africhess-gold hover:underline"
                  title={t("admin.title")}
                >
                  <Shield size={16} />
                  {t("nav.admin")}
                </Link>
              )}
              <NotificationBell />
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-90" onClick={closeMobile}>
                <UserAvatar
                  avatar={user.avatar}
                  displayName={user.display_name}
                  username={user.username}
                  size={32}
                />
                <span className="text-sm font-medium hidden sm:inline hover:text-africhess-gold">
                  {user.display_name || user.username}
                </span>
              </Link>
              <button onClick={logout} className="text-sm text-africhess-terracotta hover:underline">
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 ml-2">
              <Link href="/login" className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10">
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-1.5 rounded-lg african-gradient text-white font-medium"
              >
                {t("nav.signup")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="md:hidden border-t border-white/10 bg-[var(--card)] px-4 py-3"
        >
          <div className="flex flex-col gap-1 text-sm font-medium">
            {NAV_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className="py-2.5 px-2 rounded-lg hover:bg-white/10 hover:text-africhess-gold"
              >
                {t(key)}
              </Link>
            ))}
            {user?.is_staff && (
              <Link
                href="/admin"
                onClick={closeMobile}
                className="py-2.5 px-2 rounded-lg hover:bg-white/10 text-africhess-gold flex items-center gap-2"
              >
                <Shield size={16} />
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
