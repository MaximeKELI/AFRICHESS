"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search } from "lucide-react";
import { socialApi, type UserSearchHit } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { ChallengeUserButton } from "@/components/social/ChallengeUserButton";
import { countryFlag } from "@/lib/worldCountries";
import clsx from "clsx";

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

export function UserSearchBar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDropdown = open && query.trim().length >= 2;

  const updateDropdownRect = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const search = useCallback(
    (q: string) => {
      if (!user || q.trim().length < 2) {
        setResults([]);
        setSearchError(null);
        return;
      }
      setLoading(true);
      setSearchError(null);
      socialApi
        .searchUsers(q.trim())
        .then(({ data }) => setResults(Array.isArray(data) ? data : []))
        .catch((err) => {
          setResults([]);
          setSearchError(formatApiError(err, t("social.search.error")));
        })
        .finally(() => setLoading(false));
    },
    [user, t]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    if (!showDropdown) {
      setDropdownRect(null);
      return;
    }
    updateDropdownRect();
    const onScrollOrResize = () => updateDropdownRect();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showDropdown, updateDropdownRect, results.length, loading]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest("[data-user-search-dropdown]")) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;

  const dropdown =
    showDropdown && dropdownRect && typeof document !== "undefined"
      ? createPortal(
          <div
            data-user-search-dropdown
            className="rounded-xl border border-white/10 bg-[var(--card)] shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 210,
            }}
            role="listbox"
          >
            {loading ? (
              <p className="p-3 text-xs opacity-55">{t("common.loading")}</p>
            ) : searchError ? (
              <p className="p-3 text-xs text-africhess-terracotta">{searchError}</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-xs opacity-55">{t("social.search.empty")}</p>
            ) : (
              <>
                {results.map((hit) => (
                  <div
                    key={hit.user.id}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/8 transition-colors"
                  >
                    <Link
                      href={`/profile/${hit.user.username}`}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <UserAvatar
                        avatar={hit.user.avatar}
                        avatarPreset={hit.user.avatar_preset}
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
                    </Link>
                    <ChallengeUserButton username={hit.user.username} compact />
                  </div>
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
          </div>,
          document.body
        )
      : null;

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
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
      </div>
      {dropdown}
    </div>
  );
}
