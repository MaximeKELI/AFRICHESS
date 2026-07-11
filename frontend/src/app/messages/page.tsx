"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { unwrapList } from "@/lib/unwrapList";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

import { UserAvatar } from "@/components/profile/UserAvatar";

interface UserPublic {
  id: number;
  username: string;
  display_name: string;
  country: string;
  avatar?: string | null;
  avatar_preset?: string | null;
}

interface Friendship {
  from_user: UserPublic;
  to_user: UserPublic;
}

export default function MessagesInboxPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<UserPublic[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    socialApi
      .friends()
      .then(({ data }) => {
        const list = unwrapList<Friendship>(data);
        setFriends(
          list.map((f) => (f.from_user.id === user?.id ? f.to_user : f.from_user))
        );
      })
      .catch((err) => {
        setFriends([]);
        setLoadError(formatApiError(err, t("friends.error.load")));
      });
  }, [user?.id, t]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("friends.loginRequired")}</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold">{t("friends.messages.title")}</h1>
        <Link href="/friends" className="text-sm text-africhess-gold hover:underline">
          {t("friends.title")}
        </Link>
      </div>

      {loadError && (
        <InlineAlert className="mb-4" onDismiss={() => setLoadError(null)}>
          {loadError}
        </InlineAlert>
      )}

      {friends.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="opacity-60 mb-4">{t("friends.list.empty")}</p>
          <Link href="/users/search" className="text-africhess-gold text-sm hover:underline">
            {t("social.search.title")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {friends.map((f) => (
            <li key={f.id}>
              <Link
                href={`/messages/${encodeURIComponent(f.username)}`}
                className="glass-card flex items-center gap-3 p-4 hover:border-africhess-gold/40 transition-colors"
              >
                <UserAvatar
                  avatar={f.avatar}
                  avatarPreset={f.avatar_preset}
                  displayName={f.display_name}
                  username={f.username}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{f.display_name || f.username}</p>
                  <p className="text-xs opacity-50">@{f.username}</p>
                </div>
                <span className="text-xs text-africhess-gold shrink-0">{t("social.message")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
