"use client";

import { useEffect, useState } from "react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { Heart, MessageCircle } from "lucide-react";

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

export default function CommunityPage() {
  const { t, locale } = useTranslation();
  const [clubs, setClubs] = useState<Array<{ name: string; slug: string; country: string; member_count: number }>>([]);
  const [players, setPlayers] = useState<Array<{ username: string; display_name: string; country: string; title?: string }>>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      socialApi.clubs(),
      socialApi.africanPlayers(),
      socialApi.forum({ featured: true }),
    ])
      .then(([clubsRes, playersRes, forumRes]) => {
        setClubs(clubsRes.data.results || clubsRes.data);
        setPlayers(playersRes.data.results || playersRes.data);
        setPosts(Array.isArray(forumRes.data) ? forumRes.data : forumRes.data.results ?? []);
        setError(null);
      })
      .catch((err) => {
        setClubs([]);
        setPlayers([]);
        setPosts([]);
        setError(formatApiError(err, t("community.error.load")));
      })
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">{t("community.title")}</h1>
      {error && <InlineAlert className="mb-6">{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60 mb-6">{t("common.loading")}</p>}

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-africhess-terracotta">
            {t("community.feed.title")}
          </h2>
          <Link href="/community/all" className="text-sm text-africhess-gold hover:underline">
            {t("community.feed.all")}
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {posts.length > 0 ? posts.map((p) => (
            <Link
              key={p.id}
              href={`/community/${p.id}`}
              className="glass-card p-5 hover:ring-2 ring-africhess-gold/30 block"
            >
              <span className="text-[10px] uppercase opacity-50">{p.category}</span>
              <h3 className="font-semibold text-africhess-gold mb-2 mt-1">{p.title}</h3>
              <p className="text-sm opacity-80 leading-relaxed line-clamp-3">{p.body}</p>
              <p className="text-xs opacity-50 mt-3 flex items-center gap-3">
                <span>{p.author.display_name || p.author.username}</span>
                <span className="flex items-center gap-1"><Heart size={12} />{p.likes_count}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} />{p.comments_count}</span>
              </p>
            </Link>
          )) : (
            <p className="opacity-60 col-span-full">{t("community.feed.empty")}</p>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-africhess-gold">{t("community.players.title")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.length > 0 ? players.map((p) => (
            <Link key={p.username} href={`/profile/${p.username}`} className="glass-card p-4 hover:ring-2 ring-africhess-gold/30">
              <p className="font-semibold">{p.title && `${p.title} `}{p.display_name || p.username}</p>
              <p className="text-sm opacity-60">{p.country}</p>
            </Link>
          )) : (
            <p className="opacity-60 col-span-full">{t("community.players.empty")}</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-africhess-green">{t("community.clubs.title")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {clubs.length > 0 ? clubs.map((c) => (
            <Link key={c.slug} href={`/clubs/${c.slug}`} className="glass-card p-4 hover:ring-2 ring-africhess-green/30">
              <h3 className="font-semibold">{c.name}</h3>
              <p className="text-sm opacity-60">{c.country} · {t("community.clubs.members", { count: c.member_count })}</p>
            </Link>
          )) : (
            <p className="opacity-60">{t("community.clubs.empty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
