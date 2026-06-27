"use client";

import { BlogEditor } from "@/components/blog/BlogEditor";
import { useTranslation } from "@/hooks/useTranslation";

export default function NewBlogPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BlogEditor />
      <p className="text-xs opacity-50 text-center mt-6 max-w-xl mx-auto">{t("blog.new.diagramHint")}</p>
    </div>
  );
}
