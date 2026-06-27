"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { UserFlair } from "@/components/profile/UserFlair";
import { PenLine } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string; flair?: string };
}

export default function BlogPage() {
  const { t, locale } = useTranslation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socialApi
      .forum({ category: "blog" })
      .then(({ data }) => setPosts(Array.isArray(data) ? data : data.results ?? []))
      .catch((err) => setError(formatApiError(err, t("blog.error.load"))));
  }, [t]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("blog.title")}</h1>
          <p className="text-sm opacity-60 mt-1">{t("blog.subtitle")}</p>
        </div>
        <Link
          href="/blog/new"
          className="inline-flex items-center gap-2 px-4 py-2 african-gradient text-white rounded-lg text-sm font-medium"
        >
          <PenLine size={16} />
          {t("blog.new.button")}
        </Link>
      </div>

      {error && <p className="text-africhess-terracotta text-sm">{error}</p>}

      <div className="space-y-4">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.id}`}
            className="glass-card p-5 block hover:border-africhess-gold/40 transition-colors"
          >
            <h2 className="font-semibold text-lg">{p.title}</h2>
            <p className="text-xs opacity-50 mt-2 inline-flex items-center gap-1">
              <UserFlair flair={p.author.flair} />
              {p.author.display_name || p.author.username} · {formatLocaleDate(p.created_at, locale)}
            </p>
            <p className="text-sm opacity-70 mt-2 line-clamp-2">{p.body.replace(/\[diagram:[^\]]+\]/g, "♟")}</p>
          </Link>
        ))}
        {posts.length === 0 && !error && (
          <p className="text-sm opacity-60 text-center py-12">{t("blog.empty")}</p>
        )}
      </div>
    </div>
  );
}
