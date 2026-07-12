"use client";

import Link from "next/link";
import {
  BookOpen,
  Clock,
  FileInput,
  LayoutGrid,
  Search,
  Wrench,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const SECTIONS = [
  { href: "/analysis", key: "analysisBoard", icon: LayoutGrid, descKey: "tools.hub.analysisDesc" },
  { href: "/opening", key: "openingExplorer", icon: BookOpen, descKey: "tools.hub.openingDesc" },
  { href: "/editor", key: "boardEditor", icon: Wrench, descKey: "tools.hub.editorDesc" },
  { href: "/paste", key: "importGame", icon: FileInput, descKey: "tools.hub.pasteDesc" },
  { href: "/games/search", key: "advancedSearch", icon: Search, descKey: "tools.hub.searchDesc" },
  { href: "/clock", key: "clocks", icon: Clock, descKey: "tools.hub.clockDesc" },
] as const;

export default function ToolsHubPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("tools.title")}</h1>
      <p className="opacity-70 mb-8 max-w-2xl">{t("tools.subtitle")}</p>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, key, icon: Icon, descKey }) => (
          <Link
            key={href}
            href={href}
            className="glass-card p-5 hover:ring-2 ring-africhess-gold/30 block group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon size={22} className="text-africhess-gold group-hover:scale-110 transition-transform" />
              <h2 className="font-semibold text-lg">{t(`nav.${key}`)}</h2>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">{t(descKey)}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
