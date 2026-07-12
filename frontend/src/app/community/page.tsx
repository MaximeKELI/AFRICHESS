"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Heart,
  MessageCircle,
  Newspaper,
  Radio,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";

interface ForumPost {
  id: number;
  title: string;
  body: string;
  category: string;
  likes_count: number;
  comments_count: number;
  author: { username: string; display_name: string };
}

const SECTIONS = [
  { href: "/players", key: "players", icon: Trophy, descKey: "community.hub.playersDesc" },
  { href: "/friends", key: "friends", icon: UserPlus, descKey: "community.hub.friendsDesc" },
  { href: "/forum", key: "forums", icon: MessageCircle, descKey: "community.hub.forumsDesc" },
  { href: "/blog", key: "blog", icon: Newspaper, descKey: "community.hub.blogDesc" },
  { href: "/teams", key: "teams", icon: Users, descKey: "community.hub.teamsDesc" },
  { href: "/streamers", key: "streamers", icon: Radio, descKey: "community.hub.streamersDesc" },
] as const;

export default function CommunityPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socialApi
      .forum({ featured: true })
      .then((res) => {
        setPosts(Array.isArray(res.data) ? res.data : res.data.results ?? []);
        setError(null);
      })
      .catch((err) => {
        setPosts([]);
        setError(formatApiError(err, t("community.error.load")));
      });
  }, [t]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("community.title")}</h1>
      <p className="opacity-70 mb-8 max-w-2xl">{t("community.hub.subtitle")}</p>
      {error && <InlineAlert className="mb-6">{error}</InlineAlert>}

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
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

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen size={20} className="text-africhess-terracotta" />
            {t("community.feed.title")}
          </h2>
          <Link href="/forum" className="text-sm text-africhess-gold hover:underline">
            {t("community.hub.allForums")}
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {posts.length > 0 ? (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/forum/${p.id}`}
                className="glass-card p-5 hover:ring-2 ring-africhess-gold/30 block"
              >
                <span className="text-[10px] uppercase opacity-50">{p.category}</span>
                <h3 className="font-semibold text-africhess-gold mb-2 mt-1">{p.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed line-clamp-3">{p.body}</p>
                <p className="text-xs opacity-50 mt-3 flex items-center gap-3">
                  <span>{p.author.display_name || p.author.username}</span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} />
                    {p.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} />
                    {p.comments_count}
                  </span>
                </p>
              </Link>
            ))
          ) : (
            <p className="opacity-60 col-span-full">{t("community.feed.empty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
