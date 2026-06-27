"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";

export default function VoteChessPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const [clubWhite, setClubWhite] = useState("");
  const [clubBlack, setClubBlack] = useState("");
  const [mode, setMode] = useState("rapid");
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!user) return;
    setError(null);
    try {
      const { data } = await gamesApi.createVoteGame(clubWhite.trim(), clubBlack.trim(), mode);
      router.push(`/play?game=${data.id}&mode=${mode}`);
    } catch (err) {
      setError(formatApiError(err, t("vote.error")));
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("vote.loginRequired")}</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link href="/play" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.play")}
      </Link>
      <h1 className="font-display text-3xl font-bold">{t("vote.title")}</h1>
      <p className="text-sm opacity-60">{t("vote.subtitle")}</p>

      {error && <p className="text-sm text-africhess-terracotta">{error}</p>}

      <div className="glass-card p-4 space-y-3">
        <input
          value={clubWhite}
          onChange={(e) => setClubWhite(e.target.value)}
          placeholder={t("vote.clubWhite")}
          className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
        />
        <input
          value={clubBlack}
          onChange={(e) => setClubBlack(e.target.value)}
          placeholder={t("vote.clubBlack")}
          className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
        >
          <option value="blitz">Blitz</option>
          <option value="rapid">Rapide</option>
        </select>
        <button
          type="button"
          onClick={create}
          disabled={!clubWhite.trim() || !clubBlack.trim()}
          className="w-full py-2.5 african-gradient text-white rounded-lg disabled:opacity-50"
        >
          {t("vote.create")}
        </button>
      </div>
    </div>
  );
}
