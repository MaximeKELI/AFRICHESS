"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface ForumPost {
  id: number;
  title: string;
  category: string;
  author: { username: string; display_name: string };
}

export default function CommunityAllPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socialApi
      .forum()
      .then(({ data }) => setPosts(Array.isArray(data) ? data : []))
      .catch((err) => setError(formatApiError(err, t("forum.error.load"))));
  }, [t]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/community" className="text-sm text-africhess-gold hover:underline mb-4 inline-block">
        ← {t("forum.back")}
      </Link>
      <h1 className="font-display text-2xl font-bold mb-6">{t("community.feed.all")}</h1>
      {error && <InlineAlert>{error}</InlineAlert>}
      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/community/${p.id}`} className="glass-card p-4 block hover:ring-2 ring-africhess-gold/20">
              <span className="text-[10px] opacity-50 uppercase">{p.category}</span>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs opacity-50">{p.author.display_name || p.author.username}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
