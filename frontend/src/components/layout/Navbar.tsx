"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { t } from "@/lib/i18n";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";

export function Navbar() {
  const { user, locale, setLocale, darkMode, toggleDarkMode, lowBandwidth, setLowBandwidth, logout } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--card)]/90 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/images/logo.png" alt="AFRICHESS" width={40} height={40} className="rounded-lg" />
          <span className="font-display text-xl font-bold bg-gradient-to-r from-africhess-gold to-africhess-green bg-clip-text text-transparent">
            AFRICHESS
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/play" className="hover:text-africhess-gold transition-colors">{t(locale, "nav.play")}</Link>
          <Link href="/puzzles" className="hover:text-africhess-gold transition-colors">{t(locale, "nav.puzzles")}</Link>
          <Link href="/leaderboard" className="hover:text-africhess-gold transition-colors">{t(locale, "leaderboard.african")}</Link>
          <Link href="/community" className="hover:text-africhess-gold transition-colors">{t(locale, "nav.community")}</Link>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as typeof locale)}
            className="bg-transparent text-sm border border-white/20 rounded-lg px-2 py-1"
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="ar">AR</option>
            <option value="pt">PT</option>
            <option value="sw">SW</option>
          </select>

          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-white/10" aria-label="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setLowBandwidth(!lowBandwidth)}
            className="p-2 rounded-lg hover:bg-white/10"
            title="Low bandwidth mode"
            aria-label="Low bandwidth"
          >
            {lowBandwidth ? <WifiOff size={18} /> : <Wifi size={18} />}
          </button>

          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <Link href="/profile" className="text-sm font-medium hover:text-africhess-gold">
                {user.display_name || user.username}
              </Link>
              <button onClick={logout} className="text-sm text-africhess-terracotta hover:underline">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-2 ml-2">
              <Link href="/login" className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10">
                {t(locale, "nav.login")}
              </Link>
              <Link href="/register" className="text-sm px-4 py-1.5 rounded-lg african-gradient text-white font-medium">
                {t(locale, "nav.signup")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
