"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VideoEmbed } from "@/components/learning/VideoEmbed";
import { learningApi } from "@/lib/learningApi";
import { useTranslation } from "@/hooks/useTranslation";

interface VideoRow {
  id: number;
  title: string;
  url: string;
  category: string;
  is_premium: boolean;
  locked?: boolean;
}

export default function VideosPage() {
  const { t, locale } = useTranslation();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [selected, setSelected] = useState<VideoRow | null>(null);

  useEffect(() => {
    learningApi.videos(undefined, locale).then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setVideos(list);
      const firstUnlocked = list.find((v) => !v.locked && v.url) ?? list[0] ?? null;
      setSelected(firstUnlocked);
    }).catch(() => setVideos([]));
  }, [locale]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">← {t("nav.learn")}</Link>
      <h1 className="font-display text-3xl font-bold">{t("videos.title")}</h1>
      <p className="text-sm opacity-60">{t("videos.subtitle")}</p>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="glass-card p-4">
          {selected ? (
            <>
              <h2 className="font-semibold mb-3">{selected.title}</h2>
              {selected.locked || !selected.url ? (
                <div className="text-sm opacity-70 space-y-3">
                  <p>{t("premium.subtitle")}</p>
                  <Link href="/premium" className="inline-block text-africhess-gold hover:underline">
                    {t("premium.subscribe")}
                  </Link>
                </div>
              ) : (
                <VideoEmbed url={selected.url} />
              )}
            </>
          ) : (
            <p className="text-sm opacity-60">{t("videos.empty")}</p>
          )}
        </div>
        <ul className="space-y-2">
          {videos.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => !v.locked && setSelected(v)}
                disabled={Boolean(v.locked)}
                className={`w-full text-left text-sm p-3 rounded-lg border ${
                  selected?.id === v.id ? "border-africhess-gold bg-africhess-gold/10" : "border-white/10"
                } ${v.locked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {v.title}
                {v.locked && (
                  <span className="ml-1 text-[10px] text-africhess-gold uppercase">{t("bots.premium")}</span>
                )}
                <span className="block text-xs opacity-50 capitalize">{v.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
