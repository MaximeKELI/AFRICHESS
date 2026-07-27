"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { adminApi } from "@/lib/api";
import {
  Shield,
  Users,
  ExternalLink,
  LayoutDashboard,
  Scale,
  ChevronRight,
  Table2,
  Percent,
  FlaskConical,
  Megaphone,
} from "lucide-react";
import clsx from "clsx";
import { AdminBadge, AdminSkeleton } from "@/components/admin/AdminPrimitives";

const ADMIN_LINKS = [
  { href: "/admin", key: "admin.nav.overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/tables", key: "admin.nav.tables", icon: Table2 },
  { href: "/admin/stats", key: "admin.nav.stats", icon: Percent },
  { href: "/admin/data-science", key: "admin.nav.dataScience", icon: FlaskConical },
  { href: "/admin/users", key: "admin.nav.users", icon: Users },
  { href: "/admin/ads", key: "admin.nav.ads", icon: Megaphone },
  { href: "/admin/fairplay", key: "admin.nav.fairplay", icon: Scale, badge: "fairplay" as const },
] as const;

function djangoAdminUrl() {
  return `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}/admin/`;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, fetchProfile } = useAuthStore();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [pendingFairplay, setPendingFairplay] = useState<number | null>(null);

  useEffect(() => {
    fetchProfile().finally(() => setChecking(false));
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.is_staff) return;
    let cancelled = false;
    adminApi
      .fairplayOverview()
      .then(({ data }) => {
        if (!cancelled) setPendingFairplay(Number(data?.pending_cases ?? 0));
      })
      .catch(() => {
        if (!cancelled) setPendingFairplay(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.is_staff, pathname]);

  if (checking) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <AdminSkeleton rows={6} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl african-gradient flex items-center justify-center">
          <Shield className="text-white" size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">{t("admin.title")}</h1>
        <p className="opacity-70">{t("admin.loginRequired")}</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname || "/admin")}`}
          className="inline-flex px-5 py-2.5 rounded-lg african-gradient text-white text-sm font-medium"
        >
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  if (!user.is_staff) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl border border-africhess-gold/40 flex items-center justify-center">
          <Shield className="text-africhess-gold" size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">{t("admin.title")}</h1>
        <p className="opacity-70">{t("admin.forbidden")}</p>
        <p className="text-sm opacity-50">{t("admin.forbiddenHint")}</p>
        <Link href="/" className="inline-flex text-africhess-gold hover:underline text-sm">
          ← {t("legal.backHome")}
        </Link>
      </div>
    );
  }

  const crumbs = (() => {
    if (pathname.startsWith("/admin/fairplay/games/")) {
      return [
        { href: "/admin/fairplay", label: t("admin.nav.fairplay") },
        { label: t("admin.fairplay.gameTitle") },
      ];
    }
    if (pathname.startsWith("/admin/users/") && pathname !== "/admin/users") {
      return [
        { href: "/admin/users", label: t("admin.nav.users") },
        { label: t("admin.users.detail") },
      ];
    }
    if (pathname.startsWith("/admin/fairplay")) {
      return [{ label: t("admin.nav.fairplay") }];
    }
    if (pathname.startsWith("/admin/users")) {
      return [{ label: t("admin.nav.users") }];
    }
    if (pathname.startsWith("/admin/tables")) {
      return [{ label: t("admin.nav.tables") }];
    }
    if (pathname.startsWith("/admin/stats")) {
      return [{ label: t("admin.nav.stats") }];
    }
    if (pathname.startsWith("/admin/data-science")) {
      return [{ label: t("admin.nav.dataScience") }];
    }
    if (pathname.startsWith("/admin/ads")) {
      return [{ label: t("admin.nav.ads") }];
    }
    return [{ label: t("admin.nav.overview") }];
  })();

  const navItems = ADMIN_LINKS.map((link) => {
    const { href, key, icon: Icon } = link;
    const exact = "exact" in link && link.exact;
    const active = exact ? pathname === href : pathname.startsWith(href);
    const showBadge = "badge" in link && link.badge === "fairplay" && pendingFairplay != null && pendingFairplay > 0;
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
          active
            ? "african-gradient text-white shadow-sm"
            : "opacity-75 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
        )}
      >
        <Icon size={17} className="shrink-0" />
        <span className="flex-1 truncate">{t(key)}</span>
        {showBadge && (
          <span
            className={clsx(
              "min-w-[1.25rem] h-5 px-1.5 rounded-md text-[11px] font-bold tabular-nums flex items-center justify-center",
              active ? "bg-white/25 text-white" : "bg-red-500/90 text-white"
            )}
          >
            {pendingFairplay > 99 ? "99+" : pendingFairplay}
          </span>
        )}
      </Link>
    );
  });

  return (
    <div className="min-h-[70vh]">
      <div className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl african-gradient flex items-center justify-center shrink-0">
            <Shield className="text-white" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg sm:text-xl font-bold truncate">{t("admin.title")}</h1>
              <AdminBadge tone="gold">{t("admin.badge.staff")}</AdminBadge>
            </div>
            <nav className="flex items-center gap-1 text-xs opacity-55 mt-0.5 overflow-x-auto" aria-label="Breadcrumb">
              <Link href="/admin" className="hover:opacity-100 hover:text-africhess-gold shrink-0">
                Admin
              </Link>
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1 shrink-0">
                  <ChevronRight size={12} aria-hidden />
                  {"href" in c && c.href ? (
                    <Link href={c.href} className="hover:opacity-100 hover:text-africhess-gold">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="opacity-90">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs opacity-60 shrink-0">
            <span className="font-medium opacity-90">{user.username}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5 lg:py-7">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          <aside className="mb-5 lg:mb-0">
            <nav
              className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 lg:sticky lg:top-20"
              aria-label={t("admin.nav.label")}
            >
              {navItems}
              <a
                href={djangoAdminUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium opacity-75 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] lg:mt-2 lg:border-t lg:border-[var(--border-subtle)] lg:pt-3"
              >
                <ExternalLink size={17} className="shrink-0" />
                <span className="flex-1 truncate">{t("admin.nav.django")}</span>
              </a>
            </nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
