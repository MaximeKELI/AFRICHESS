"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { socialApi, type UserSearchHit } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { ChallengeUserButton } from "@/components/social/ChallengeUserButton";
import { countryFlag } from "@/lib/worldCountries";
import { InlineAlert } from "@/components/ui/InlineAlert";

export default function UserSearchContent() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQ) setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    socialApi
      .searchUsers(query.trim())
      .then(({ data }) => {
        setResults(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        setResults([]);
        setError(formatApiError(err, t("social.search.error")));
      })
      .finally(() => setLoading(false));
  }, [user, query, t]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("social.search.loginRequired")}</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("social.search.title")}</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("social.search.placeholder")}
        className="w-full border rounded-xl px-4 py-3 bg-transparent text-sm"
        autoFocus
      />
      {error && <InlineAlert>{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-55">{t("common.loading")}</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm opacity-55">{t("social.search.empty")}</p>
      )}
      <ul className="space-y-2">
        {results.map((hit) => (
          <li key={hit.user.id} className="glass-card p-4 flex items-center gap-3">
            <Link
              href={`/profile/${hit.user.username}`}
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90"
            >
              <UserAvatar
                avatar={hit.user.avatar}
                avatarPreset={hit.user.avatar_preset}
                displayName={hit.user.display_name}
                username={hit.user.username}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {hit.user.display_name || hit.user.username}
                </p>
                <p className="text-xs opacity-55">
                  @{hit.user.username}
                  {hit.user.country && (
                    <span className="ml-1.5">{countryFlag(hit.user.country)}</span>
                  )}
                </p>
              </div>
            </Link>
            {hit.blitz_elo != null && (
              <span className="font-mono text-africhess-gold shrink-0">{hit.blitz_elo}</span>
            )}
            <ChallengeUserButton username={hit.user.username} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
