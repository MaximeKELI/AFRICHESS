"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { ForumCreateForm } from "@/components/community/ForumCreateForm";
import clsx from "clsx";

interface ForumPost {
  id: number;
  title: string;
  body: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: { username: string; display_name: string };
}

const CATEGORIES = [
  { id: "", key: "forum.cat.all" },
  { id: "general", key: "forum.cat.general" },
  { id: "africa", key: "forum.cat.africa" },
  { id: "news", key: "forum.cat.news" },
  { id: "strategy", key: "forum.cat.strategy" },
  { id: "blog", key: "forum.cat.blog" },
] as const;

export default function ForumPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (cat: string) => {
    setLoading(true);
    socialApi
      .forum(cat ? { category: cat } : undefined)
      .then((res) => {
        setPosts(Array.isArray(res.data) ? res.data : res.data.results ?? []);
        setError(null);
      })
      .catch((err) => {
        setPosts([]);
        setError(formatApiError(err, t("forum.error.load")));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(category);
  }, [category, t]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/community" className="text-sm text-africhess-gold hover:underline mb-2 inline-block">
            ← {t("nav.community")}
          </Link>
          <h1 className="font-display text-3xl font-bold">{t("forum.title")}</h1>
          <p className="opacity-70 mt-1">{t("forum.subtitle")}</p>
        </div>
      </div>

      <ForumCreateForm onCreated={() => load(category)} />

      <div className="flex flex-col md:flex-row gap-6 mt-6">
        <aside className="md:w-52 shrink-0">
          <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2 px-2">
            {t("forum.categories")}
          </p>
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id || "all"}
                type="button"
                onClick={() => setCategory(c.id)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition-colors",
                  category === c.id
                    ? "bg-africhess-gold/20 text-africhess-gold font-medium"
                    : "hover:bg-white/10 opacity-80"
                )}
              >
                {t(c.key)}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {error && <InlineAlert className="mb-4">{error}</InlineAlert>}
          {loading && <p className="text-sm opacity-60 mb-4">{t("common.loading")}</p>}
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/forum/${p.id}`}
                  className="glass-card p-4 block hover:ring-2 ring-africhess-gold/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] opacity-50 uppercase">{p.category}</span>
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-xs opacity-50 mt-1">
                        {p.author.display_name || p.author.username}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs opacity-50 shrink-0">
                      <span className="flex items-center gap-1">
                        <Heart size={12} />
                        {p.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} />
                        {p.comments_count}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {!loading && posts.length === 0 && (
              <p className="opacity-60">{t("forum.empty")}</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
