"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { socialApi, type UserSearchHit } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { countryFlag } from "@/lib/worldCountries";
import clsx from "clsx";

export function UserSearchBar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      if (!user || q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      socialApi
        .searchUsers(q.trim())
        .then(({ data }) => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    },
    [user]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className={clsx("relative", compact ? "w-full" : "w-44 lg:w-56")}>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("social.search.placeholder")}
          className={clsx(
            "w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/15 bg-black/20 text-sm",
            "placeholder:opacity-45 focus:outline-none focus:ring-1 focus:ring-africhess-gold/60"
          )}
          aria-label={t("social.search.placeholder")}
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/10 bg-[var(--card)] shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {loading ? (
            <p className="p-3 text-xs opacity-55">{t("common.loading")}</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs opacity-55">{t("social.search.empty")}</p>
          ) : (
            <>
              {results.map((hit) => (
                <Link
                  key={hit.user.id}
                  href={`/profile/${hit.user.username}`}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 transition-colors"
                >
                  <UserAvatar
                    avatar={hit.user.avatar}
                    displayName={hit.user.display_name}
                    username={hit.user.username}
                    size={32}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {hit.user.display_name || hit.user.username}
                    </p>
                    <p className="text-[11px] opacity-55 truncate">
                      @{hit.user.username}
                      {hit.user.country && (
                        <span className="ml-1.5">{countryFlag(hit.user.country)}</span>
                      )}
                      {hit.blitz_elo != null && (
                        <span className="ml-1.5 font-mono">{hit.blitz_elo}</span>
                      )}
                    </p>
                  </div>
                  {hit.relationship.friendship_status === "friends" && (
                    <span className="text-[10px] text-africhess-green shrink-0">
                      {t("social.status.friends")}
                    </span>
                  )}
                </Link>
              ))}
              <Link
                href={`/users/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs text-center text-africhess-gold border-t border-white/10 hover:bg-white/5"
              >
                {t("social.search.seeAll")}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
