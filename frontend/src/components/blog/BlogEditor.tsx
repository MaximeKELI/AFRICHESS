"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { socialApi } from "@/lib/api";
import { insertDiagramMarker } from "@/lib/blogBody";
import { formatApiError } from "@/lib/errors";
import { MiniBoard } from "@/components/learning/MiniBoard";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Éditeur de blog avec insertion de diagrammes échecs */
export function BlogEditor() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fen, setFen] = useState(DEFAULT_FEN);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <p className="text-sm opacity-60">
        {t("blog.loginRequired")}{" "}
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </p>
    );
  }

  const addDiagram = () => {
    setBody((b) => insertDiagramMarker(b, fen));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await socialApi.createForumPost({
        title: title.trim(),
        body: body.trim(),
        category: "blog",
      });
      router.push(`/blog/${data.id}`);
    } catch (err) {
      setError(formatApiError(err, t("blog.error.create")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold">{t("blog.new.title")}</h1>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("blog.new.postTitle")}
        className="w-full px-4 py-3 rounded-lg border bg-transparent"
        required
        minLength={3}
        maxLength={200}
        aria-label={t("blog.new.postTitle")}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("blog.new.bodyHint")}
        className="w-full px-4 py-3 rounded-lg border bg-transparent min-h-[200px] font-mono text-sm"
        required
        minLength={20}
        aria-label={t("blog.new.bodyHint")}
      />
      <div className="border border-white/10 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">{t("blog.new.diagram")}</p>
        <input
          type="text"
          value={fen}
          onChange={(e) => setFen(e.target.value)}
          className="w-full px-3 py-2 rounded border bg-transparent text-xs font-mono"
          aria-label="FEN"
        />
        <MiniBoard fen={fen} />
        <button
          type="button"
          onClick={addDiagram}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10"
        >
          {t("blog.new.insertDiagram")}
        </button>
      </div>
      {error && (
        <p className="text-africhess-terracotta text-sm" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 african-gradient text-white rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? t("common.loading") : t("blog.new.publish")}
      </button>
    </form>
  );
}
