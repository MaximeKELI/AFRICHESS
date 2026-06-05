"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { ArrowLeft, Heart } from "lucide-react";

interface PostDetail {
  id: number;
  title: string;
  body: string;
  category: string;
  likes_count: number;
  created_at: string;
  author: { username: string; display_name: string };
  comments: { id: number; body: string; created_at: string; author: { username: string; display_name: string } }[];
}

export default function ForumPostPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    socialApi
      .forumPost(id)
      .then(({ data }) => setPost(data))
      .catch((err) => setError(formatApiError(err, t("forum.error.load"))));
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    try {
      await socialApi.forumComment(id, comment.trim());
      setComment("");
      load();
    } catch (err) {
      setError(formatApiError(err, t("forum.error.comment")));
    }
  };

  const like = async () => {
    if (!user) return;
    try {
      const { data } = await socialApi.forumLike(id);
      setPost((p) => (p ? { ...p, likes_count: data.likes_count } : p));
    } catch {
      /* ignore */
    }
  };

  if (!post && !error) return <p className="p-8 text-center opacity-60">{t("common.loading")}</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/community" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft size={16} />
        {t("forum.back")}
      </Link>
      {error && <InlineAlert>{error}</InlineAlert>}
      {post && (
        <>
          <article className="glass-card p-6">
            <span className="text-xs uppercase opacity-50">{post.category}</span>
            <h1 className="font-display text-2xl font-bold mt-1">{post.title}</h1>
            <p className="text-xs opacity-50 mt-2">
              {post.author.display_name || post.author.username} ·{" "}
              {formatLocaleDate(locale, post.created_at, { dateStyle: "medium" })}
            </p>
            <p className="mt-4 whitespace-pre-wrap opacity-90 leading-relaxed">{post.body}</p>
            <button
              type="button"
              onClick={like}
              className="mt-4 flex items-center gap-1 text-sm text-africhess-terracotta hover:opacity-80"
            >
              <Heart size={16} />
              {post.likes_count}
            </button>
          </article>

          <section className="space-y-4">
            <h2 className="font-semibold">{t("forum.comments")} ({post.comments.length})</h2>
            {post.comments.map((c) => (
              <div key={c.id} className="glass-card p-4 text-sm">
                <p className="font-medium">{c.author.display_name || c.author.username}</p>
                <p className="opacity-90 mt-1">{c.body}</p>
              </div>
            ))}
            {user ? (
              <form onSubmit={submitComment} className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("forum.commentPlaceholder")}
                  className="flex-1 px-4 py-2 rounded-lg border bg-transparent"
                />
                <button type="submit" className="px-4 py-2 rounded-lg african-gradient text-white text-sm">
                  {t("forum.send")}
                </button>
              </form>
            ) : (
              <p className="text-sm opacity-60">{t("forum.loginToComment")}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
