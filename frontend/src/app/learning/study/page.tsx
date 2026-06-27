"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export default function StudyPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [due, setDue] = useState<{ line_id: number; name: string; moves_uci: string[] } | null>(null);
  const [played, setPlayed] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  const loadDue = () => {
    learningApi.studyReviewDue().then(({ data }) => {
      if (data?.line_id) setDue(data);
      else setDue(null);
    }).catch(() => setDue(null));
  };

  useEffect(() => {
    if (user) loadDue();
  }, [user]);

  const submitMove = async (uci: string) => {
    if (!due) return;
    const next = [...played, uci];
    setPlayed(next);
    const { data } = await learningApi.submitStudyReview(due.line_id, next);
    if (data.completed) {
      setMsg(t("study.complete"));
      setPlayed([]);
      loadDue();
    } else if (!data.correct) {
      setMsg(t("study.wrong"));
      setPlayed([]);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Link href="/login" className="text-africhess-gold underline">{t("nav.login")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">← {t("nav.learn")}</Link>
      <h1 className="font-display text-2xl font-bold">{t("study.title")}</h1>
      <p className="text-sm opacity-60">{t("study.subtitle")}</p>

      {!due ? (
        <p className="text-sm opacity-60">{t("study.noDue")}</p>
      ) : (
        <div className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">{due.name}</h2>
          <p className="text-xs opacity-60">{t("study.progress", { n: played.length, total: due.moves_uci.length })}</p>
          <p className="text-xs font-mono">{played.join(" ")}</p>
          <p className="text-xs text-africhess-gold">{t("study.nextHint")}: {due.moves_uci[played.length] ?? "—"}</p>
          <input
            className="w-full px-3 py-2 rounded border bg-transparent text-sm font-mono"
            placeholder="UCI (ex: e2e4)"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitMove((e.target as HTMLInputElement).value.trim());
            }}
          />
        </div>
      )}
      {msg && <p className="text-sm text-africhess-green">{msg}</p>}
    </div>
  );
}
