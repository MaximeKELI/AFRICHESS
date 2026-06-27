"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { formatLocaleDate } from "@/lib/i18n/labels";
import { BlogBody } from "@/components/blog/BlogBody";
import { UserFlair } from "@/components/profile/UserFlair";
import { ArrowLeft } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  body: string;
  category: string;
  created_at: string;
  author: { username: string; display_name: string; flair?: string };
}

export default function BlogPostPage() {
  const params = useParams();
  const id = Number(params.id);
  const { t, locale } = useTranslation();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    socialApi
      .forumPost(id)
      .then(({ data }) => setPost(data))
      .catch((err) => setError(formatApiError(err, t("blog.error.load"))));
  }, [id, t]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-africhess-terracotta">{error}</p>
        <Link href="/blog" className="text-africhess-gold underline mt-4 inline-block">
          {t("blog.back")}
        </Link>
      </div>
    );
  }

  if (!post) {
    return <p className="text-center py-20 opacity-60">{t("common.loading")}</p>;
  }

  return (
    <article className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100">
        <ArrowLeft size={16} />
        {t("blog.back")}
      </Link>
      <header>
        <h1 className="font-display text-3xl font-bold">{post.title}</h1>
        <p className="text-sm opacity-50 mt-2 inline-flex items-center gap-1">
          <UserFlair flair={post.author.flair} />
          {post.author.display_name || post.author.username} · {formatLocaleDate(post.created_at, locale)}
        </p>
      </header>
      <BlogBody body={post.body} />
    </article>
  );
}
