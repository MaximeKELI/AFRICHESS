"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { Shield, Users, BarChart3, LayoutDashboard } from "lucide-react";
import clsx from "clsx";

const ADMIN_LINKS = [
  { href: "/admin", key: "admin.nav.overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", key: "admin.nav.users", icon: Users },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, fetchProfile } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchProfile().finally(() => setChecking(false));
  }, [fetchProfile]);

  useEffect(() => {
    if (!checking && (!user || !user.is_staff)) {
      router.replace("/");
    }
  }, [checking, user, router]);

  if (checking) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center opacity-60">
        {t("common.loading")}
      </div>
    );
  }

  if (!user?.is_staff) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="text-africhess-gold" size={32} />
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.title")}</h1>
          <p className="text-sm opacity-60">{t("admin.subtitle")}</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-8">
        {ADMIN_LINKS.map((link) => {
          const { href, key, icon: Icon } = link;
          const exact = "exact" in link && link.exact;
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                active
                  ? "african-gradient text-white border-transparent"
                  : "hover:border-africhess-gold/40"
              )}
            >
              <Icon size={16} />
              {t(key)}
            </Link>
          );
        })}
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}/admin/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border hover:border-africhess-gold/40 ml-auto"
        >
          <BarChart3 size={16} />
          {t("admin.nav.django")}
        </a>
      </nav>

      {children}
    </div>
  );
}
