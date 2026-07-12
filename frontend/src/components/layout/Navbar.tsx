"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { UserFlair } from "@/components/profile/UserFlair";
import { usePreferencesStore } from "@/store/preferences";
import { ChevronDown, Menu, Moon, Shield, Sun, Wifi, WifiOff, X, Leaf } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { MessagesNavButton } from "./MessagesNavButton";
import { UserSearchBar } from "@/components/social/UserSearchBar";
import { MobileBottomNav } from "./MobileBottomNav";
import clsx from "clsx";

const PRIMARY_LINKS = [
  { href: "/play", key: "nav.play" },
  { href: "/puzzles", key: "nav.puzzles" },
  { href: "/learning", key: "nav.learn" },
  { href: "/tv", key: "nav.watch" },
  { href: "/community", key: "nav.community" },
] as const;

const NAV_GROUPS = [
  {
    key: "nav.group.play",
    links: [
      { href: "/lobby", key: "nav.lobby" },
      { href: "/arena", key: "nav.arena" },
      { href: "/swiss", key: "nav.swiss" },
      { href: "/simul", key: "nav.simul" },
      { href: "/play", key: "nav.playQuick" },
      { href: "/play/daily", key: "nav.daily" },
      { href: "/bots", key: "nav.bots" },
    ],
  },
  {
    key: "nav.group.puzzles",
    links: [
      { href: "/puzzles", key: "nav.puzzles" },
      { href: "/puzzles/themes", key: "nav.puzzleThemes" },
      { href: "/puzzles/dashboard", key: "nav.puzzleDashboard" },
      { href: "/puzzles/streak", key: "nav.puzzleStreak" },
      { href: "/puzzles/storm", key: "nav.puzzleStorm" },
      { href: "/puzzles/racer", key: "nav.puzzleRacer" },
    ],
  },
  {
    key: "nav.group.learn",
    links: [
      { href: "/learn", key: "nav.chessBasics" },
      { href: "/practice", key: "nav.practice" },
      { href: "/learning/coordinates", key: "nav.coordinates" },
      { href: "/studies", key: "nav.studies" },
      { href: "/coaches", key: "nav.coaches" },
      { href: "/learning/videos", key: "videos.title" },
      { href: "/learning", key: "nav.learnDashboard" },
      { href: "/learning/openings", key: "nav.openings" },
      { href: "/learning/repertoires", key: "nav.repertoire" },
      { href: "/learning/study", key: "study.title" },
      { href: "/training", key: "nav.training" },
      { href: "/insights", key: "nav.insights" },
      { href: "/learning/glossary", key: "nav.glossary" },
      { href: "/learning/analyze", key: "nav.analyze" },
      { href: "/classroom", key: "nav.classroom" },
    ],
  },
  {
    key: "nav.group.watch",
    links: [
      { href: "/tv", key: "nav.tv" },
      { href: "/live", key: "nav.currentGames" },
      { href: "/streamers", key: "nav.streamers" },
      { href: "/broadcasts", key: "nav.broadcasts" },
    ],
  },
  {
    key: "nav.group.compete",
    links: [
      { href: "/tournaments", key: "nav.tournaments" },
      { href: "/events", key: "nav.events" },
      { href: "/leagues", key: "nav.leagues" },
      { href: "/leaderboard", key: "leaderboard.title" },
      { href: "/achievements", key: "nav.achievements" },
      { href: "/premium", key: "nav.premium" },
      { href: "/stats", key: "nav.stats" },
    ],
  },
  {
    key: "nav.group.community",
    links: [
      { href: "/players", key: "nav.players" },
      { href: "/friends", key: "nav.friends" },
      { href: "/forum", key: "nav.forums" },
      { href: "/blog", key: "nav.blog" },
      { href: "/teams", key: "nav.teams" },
      { href: "/streamers", key: "nav.streamers" },
    ],
  },
] as const;

function NavDropdown({
  label,
  groups,
  onNavigate,
}: {
  label: string;
  groups: typeof NAV_GROUPS;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t } = useTranslation();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1 transition-colors",
          open ? "text-africhess-gold" : "hover:text-africhess-gold"
        )}
        aria-expanded={open}
      >
        {label}
        <ChevronDown size={14} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 md:top-16 z-layer-nav-overlay bg-black/40"
            aria-label={t("nav.menu.close")}
            onClick={close}
          />
          <div className="fixed left-0 right-0 top-14 md:top-16 z-layer-nav-menu border-b border-white/10 bg-[var(--card)]/98 backdrop-blur-lg shadow-2xl">
            <div className="max-w-7xl mx-auto p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {groups.map((group) => (
                <div key={group.key}>
                  <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2 px-2">
                    {t(group.key)}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.links.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => {
                          close();
                          onNavigate?.();
                        }}
                        className="px-2 py-2 rounded-lg text-sm hover:bg-white/10 hover:text-africhess-gold"
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, locale, setLocale, darkMode, toggleDarkMode, lowBandwidth, setLowBandwidth, logout } =
    useAuthStore();
  const { zenMode, setZenMode } = usePreferencesStore();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const UtilityButtons = ({ compact = false }: { compact?: boolean }) => (
    <>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className={clsx(
          "bg-transparent text-sm border border-white/20 rounded-lg",
          compact ? "w-full px-3 py-2" : "px-2 py-1"
        )}
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
        onClick={() => setZenMode(!zenMode)}
        className={clsx("p-2 rounded-lg hover:bg-white/10", zenMode && "text-africhess-green")}
        title={t("nav.zenMode")}
        aria-label={t("nav.zenMode")}
        aria-pressed={zenMode}
      >
        <Leaf size={18} />
      </button>
      <button
        onClick={() => setLowBandwidth(!lowBandwidth)}
        className="p-2 rounded-lg hover:bg-white/10"
        title={lowBandwidth ? t("nav.lowBandwidth.on") : t("nav.lowBandwidth.off")}
        aria-label={t("nav.lowBandwidth")}
      >
        {lowBandwidth ? <WifiOff size={18} /> : <Wifi size={18} />}
      </button>
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-layer-nav border-b border-white/10 bg-[var(--card)]/90 backdrop-blur-lg safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 md:h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={closeDrawer}>
            <Image src="/images/logo.png" alt="AFRICHESS" width={36} height={36} className="rounded-lg md:w-10 md:h-10" />
            <span className="font-display text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-africhess-gold to-africhess-green bg-clip-text text-transparent">
              AFRICHESS
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-5 text-sm font-medium">
            {PRIMARY_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "hover:text-africhess-gold transition-colors",
                  pathname.startsWith(href) && "text-africhess-gold"
                )}
              >
                {t(key)}
              </Link>
            ))}
            <NavDropdown label={t("nav.more")} groups={NAV_GROUPS} />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            {user && (
              <div className="hidden md:block">
                <UserSearchBar />
              </div>
            )}
            <div className="hidden md:flex items-center gap-1">
              <UtilityButtons />
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                {user.is_staff && (
                  <Link
                    href="/admin"
                    className="hidden lg:flex items-center gap-1 text-sm text-africhess-gold hover:underline"
                    title={t("admin.title")}
                  >
                    <Shield size={16} />
                  </Link>
                )}
                <NotificationBell />
                <MessagesNavButton />
                <Link href="/profile" className="flex items-center gap-2 hover:opacity-90" onClick={closeDrawer}>
                  <UserAvatar
                    avatar={user.avatar}
                    avatarPreset={user.avatar_preset}
                    displayName={user.display_name}
                    username={user.username}
                    size={32}
                  />
                  <span className="text-sm font-medium hidden xl:inline hover:text-africhess-gold inline-flex items-center gap-1 max-w-[120px] truncate">
                    <UserFlair flair={user.flair} />
                    {user.display_name || user.username}
                  </span>
                </Link>
                <button onClick={logout} className="text-sm text-africhess-terracotta hover:underline hidden sm:inline">
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <div className="flex gap-1 sm:gap-2">
                <Link href="/login" className="text-sm px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/10">
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-3 sm:px-4 py-1.5 rounded-lg african-gradient text-white font-medium"
                >
                  {t("nav.signup")}
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="hidden md:inline-flex lg:hidden p-2 rounded-lg hover:bg-white/10"
              aria-label={t("nav.menu.open")}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-layer-mobile-menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={t("nav.menu.close")}
            onClick={closeDrawer}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[min(100%,320px)] bg-[var(--card)] border-l border-white/10 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-display font-bold">{t("nav.menu.title")}</span>
              <button type="button" onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10" aria-label={t("nav.menu.close")}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">{t(group.key)}</p>
                  <div className="flex flex-col gap-0.5">
                    {group.links.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeDrawer}
                        className={clsx(
                          "py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-white/10",
                          pathname.startsWith(href) ? "text-africhess-gold bg-white/5" : "hover:text-africhess-gold"
                        )}
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {user?.is_staff && (
                <Link
                  href="/admin"
                  onClick={closeDrawer}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-africhess-gold"
                >
                  <Shield size={16} />
                  {t("nav.admin")}
                </Link>
              )}
            </div>
            <div className="p-4 border-t border-white/10 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap gap-2"><UtilityButtons compact /></div>
              {user && (
                <button onClick={logout} className="w-full py-2 text-sm text-africhess-terracotta border border-white/10 rounded-lg">
                  {t("nav.logout")}
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <MobileBottomNav onMenuOpen={() => setDrawerOpen(true)} />
    </>
  );
}
