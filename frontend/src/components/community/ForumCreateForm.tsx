"use client";

import { useState } from "react";
import { socialApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";

interface ForumCreateFormProps {
  onCreated: () => void;
}

export function ForumCreateForm({ onCreated }: ForumCreateFormProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <p className="text-sm opacity-60 mb-6">
        {t("forum.create.login")}{" "}
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await socialApi.createForumPost({ title: title.trim(), body: body.trim(), category });
      setTitle("");
      setBody("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(formatApiError(err, t("forum.create.error")));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 px-4 py-2 african-gradient text-white rounded-lg text-sm font-medium"
      >
        {t("forum.create.button")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 mb-6 space-y-4">
      <h2 className="font-semibold">{t("forum.create.title")}</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("forum.create.postTitle")}
        className="w-full px-4 py-3 rounded-lg border bg-transparent"
        required
        minLength={3}
        maxLength={200}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border bg-transparent"
      >
        <option value="general">{t("forum.category.general")}</option>
        <option value="strategy">{t("forum.category.strategy")}</option>
        <option value="openings">{t("forum.category.openings")}</option>
        <option value="community">{t("forum.category.community")}</option>
      </select>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("forum.create.body")}
        className="w-full px-4 py-3 rounded-lg border bg-transparent min-h-[120px]"
        required
        minLength={10}
      />
      {error && (
        <p className="text-africhess-terracotta text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 african-gradient text-white rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("forum.create.submit")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border rounded-lg text-sm opacity-70"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
