"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { socialApi, type UserRelationship } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { ChallengeUserButton } from "@/components/social/ChallengeUserButton";

interface ProfileSocialActionsProps {
  username: string;
  onChange?: () => void;
}

export function ProfileSocialActions({ username, onChange }: ProfileSocialActionsProps) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [rel, setRel] = useState<UserRelationship | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user || user.username === username) return;
    socialApi
      .userRelationship(username)
      .then(({ data }) => setRel(data))
      .catch(() => setRel(null));
  }, [user, username]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || user.username === username || !rel) return null;

  const run = async (action: () => Promise<unknown>, successKey?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      load();
      onChange?.();
      if (successKey) setMsg(t(successKey));
    } catch (err) {
      setMsg(formatApiError(err, t("social.error.action")));
    } finally {
      setBusy(false);
    }
  };

  const { friendship_status, friendship_id, is_following, followers_count, following_count, can_message } = rel;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {friendship_status === "none" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => socialApi.requestFriend(username), "social.friend.sent")}
            className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
          >
            {t("profile.public.addFriend")}
          </button>
        )}
        {friendship_status === "pending_sent" && friendship_id != null && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => socialApi.cancelFriendRequest(friendship_id), "social.friend.cancelled")}
            className="px-4 py-2 rounded-lg border text-sm opacity-80 disabled:opacity-50"
          >
            {t("social.friend.pendingSent")}
          </button>
        )}
        {friendship_status === "pending_received" && friendship_id != null && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => socialApi.acceptFriend(friendship_id), "social.friend.accepted")}
              className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
            >
              {t("friends.pending.accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => socialApi.declineFriend(friendship_id))}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50"
            >
              {t("social.friend.decline")}
            </button>
          </>
        )}
        {can_message && friendship_status !== "friends" && friendship_status !== "blocked" && (
          <Link
            href={`/messages/${encodeURIComponent(username)}`}
            className="px-4 py-2 rounded-lg border text-sm hover:border-africhess-gold"
          >
            {t("social.message")}
          </Link>
        )}

        {friendship_status === "friends" && (
          <>
            <Link
              href={`/messages/${encodeURIComponent(username)}`}
              className="px-4 py-2 rounded-lg border text-sm hover:border-africhess-gold"
            >
              {t("social.message")}
            </Link>
            <ChallengeUserButton username={username} />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("social.friend.unfriendConfirm"))) {
                  run(() => socialApi.unfriend(username));
                }
              }}
              className="px-4 py-2 rounded-lg border text-sm opacity-70 disabled:opacity-50"
            >
              {t("social.friend.unfriend")}
            </button>
          </>
        )}

        {friendship_status !== "blocked" &&
          friendship_status !== "friends" &&
          friendship_status !== "self" && (
          <ChallengeUserButton username={username} />
        )}

        {friendship_status !== "blocked" && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  is_following
                    ? socialApi.unfollowUser(username)
                    : socialApi.followUser(username),
                is_following ? "social.follow.removed" : "social.follow.added"
              )
            }
            className="px-4 py-2 rounded-lg border text-sm hover:border-africhess-gold disabled:opacity-50"
          >
            {is_following ? t("social.follow.unfollow") : t("social.follow.follow")}
          </button>
        )}

        {friendship_status !== "blocked" && friendship_status !== "friends" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t("social.block.confirm"))) {
                run(() => socialApi.blockUser(username), "social.block.done");
              }
            }}
            className="px-3 py-2 rounded-lg text-xs text-africhess-terracotta border border-africhess-terracotta/30 disabled:opacity-50"
          >
            {t("social.block.button")}
          </button>
        )}

        {friendship_status === "blocked" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => socialApi.unblockUser(username), "social.block.undone")}
            className="px-3 py-2 rounded-lg text-xs border border-white/20 disabled:opacity-50"
          >
            {t("social.block.unblock")}
          </button>
        )}
      </div>

      <p className="text-xs opacity-55">
        {t("social.follow.counts", { followers: followers_count, following: following_count })}
      </p>

      {msg && <p className="text-xs text-africhess-gold">{msg}</p>}
    </div>
  );
}
