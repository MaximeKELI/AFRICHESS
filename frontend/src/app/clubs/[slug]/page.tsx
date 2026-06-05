"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import { Users, ArrowLeft } from "lucide-react";

interface ClubDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
  is_member: boolean;
  owner: { username: string; display_name: string };
}

export default function ClubDetailPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const { user } = useAuthStore();
  const { t, locale } = useTranslation();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = () => {
    socialApi
      .club(slug)
      .then(({ data }) => setClub(data))
      .catch((err) => setError(formatApiError(err, t("clubs.error.load"))));
  };

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await socialApi.joinClub(slug);
      load();
      setError(null);
    } catch (err) {
      setError(formatApiError(err, t("clubs.error.join")));
    } finally {
      setJoining(false);
    }
  };

  if (!club && !error) return <p className="max-w-3xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <Link href="/clubs" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
        <ArrowLeft size={16} />
        {t("clubs.back")}
      </Link>

      {error && <InlineAlert>{error}</InlineAlert>}

      {club && (
        <>
          <div className="glass-card p-6">
            <h1 className="font-display text-2xl font-bold">{club.name}</h1>
            <p className="text-sm opacity-70 mt-2 flex items-center gap-2">
              <Users size={14} />
              {t("clubs.members", { count: club.member_count })}
              {club.country && (
                <span>
                  · {countryFlag(club.country)} {displayCountry(club.country, locale)}
                </span>
              )}
            </p>
            <p className="mt-4 text-sm opacity-90 whitespace-pre-wrap">
              {club.description || t("clubs.noDescription")}
            </p>
            <p className="text-xs opacity-50 mt-4">
              {t("clubs.owner")}: {club.owner.display_name || club.owner.username}
            </p>
          </div>

          {user ? (
            club.is_member ? (
              <p className="text-sm text-africhess-green">{t("clubs.alreadyMember")}</p>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="px-6 py-3 rounded-lg african-gradient text-white font-medium disabled:opacity-50"
              >
                {joining ? t("clubs.joining") : t("clubs.join")}
              </button>
            )
          ) : (
            <p className="text-sm opacity-70">
              <Link href="/login" className="text-africhess-gold underline">{t("nav.login")}</Link>
              {" "}{t("clubs.loginHint")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
