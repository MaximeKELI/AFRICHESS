"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useTranslation } from "@/hooks/useTranslation";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  data: {
    game_id?: string;
    challenge_id?: number;
    mode?: string;
    friendship_id?: number;
    from_username?: string;
  };
  is_read: boolean;
  created_at: string;
}

interface NotificationListProps {
  items: NotificationItem[];
  onMarkRead?: (id: number) => void;
  onNavigate?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export function NotificationList({
  items,
  onMarkRead,
  onNavigate,
  onRefresh,
  compact = false,
}: NotificationListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const action = (n: NotificationItem) => {
    const close = () => {
      onMarkRead?.(n.id);
      onNavigate?.();
    };

    if (n.type === "game_invite" && n.data?.challenge_id && !n.data?.game_id) {
      const challengeId = n.data.challenge_id;
      const accept = async () => {
        setBusyId(n.id);
        setError(null);
        try {
          const { data } = await gamesApi.acceptChallenge(challengeId);
          close();
          onRefresh?.();
          router.push(`/play?game=${data.game.id}&mode=${data.game.mode || n.data.mode || "blitz"}`);
        } catch (err) {
          setError(formatApiError(err, t("notifications.challengeAcceptFailed")));
        } finally {
          setBusyId(null);
        }
      };
      const decline = async () => {
        setBusyId(n.id);
        setError(null);
        try {
          await gamesApi.declineChallenge(challengeId);
          close();
          onRefresh?.();
        } catch (err) {
          setError(formatApiError(err, t("notifications.challengeDeclineFailed")));
        } finally {
          setBusyId(null);
        }
      };
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            disabled={busyId === n.id}
            onClick={() => void accept()}
            className="text-xs px-3 py-1 rounded-lg african-gradient text-white disabled:opacity-50"
          >
            {t("notifications.acceptChallenge")}
          </button>
          <button
            type="button"
            disabled={busyId === n.id}
            onClick={() => void decline()}
            className="text-xs px-3 py-1 rounded-lg border disabled:opacity-50"
          >
            {t("notifications.declineChallenge")}
          </button>
        </div>
      );
    }

    if (n.type === "game_invite" && n.data?.game_id) {
      return (
        <Link
          href={`/play?game=${n.data.game_id}`}
          onClick={close}
          className="text-xs text-africhess-green mt-2 inline-block hover:underline"
        >
          {t("notifications.joinGame")}
        </Link>
      );
    }
    if (n.type === "match_found" && n.data?.game_id) {
      return (
        <Link
          href={`/play?game=${n.data.game_id}`}
          onClick={close}
          className="text-xs text-africhess-green mt-2 inline-block hover:underline"
        >
          {t("notifications.joinGame")}
        </Link>
      );
    }
    if (n.type === "friend_request") {
      return (
        <Link
          href="/friends"
          onClick={close}
          className="text-xs text-africhess-gold mt-2 inline-block hover:underline"
        >
          {t("notifications.friendRequest")}
        </Link>
      );
    }
    if (n.type === "direct_message" && n.data?.from_username) {
      return (
        <Link
          href={`/messages/${encodeURIComponent(n.data.from_username)}`}
          onClick={close}
          className="text-xs text-africhess-gold mt-2 inline-block hover:underline"
        >
          {t("social.message")} →
        </Link>
      );
    }
    return null;
  };

  if (items.length === 0) {
    return <p className="p-6 opacity-60 text-center">{t("notifications.empty")}</p>;
  }

  return (
    <>
      {error && <p className="px-4 pb-2 text-xs text-africhess-terracotta">{error}</p>}
      <ul className={compact ? "divide-y divide-white/5" : "space-y-3"}>
        {items.map((n) => (
          <li
            key={n.id}
            className={`${compact ? "p-4" : "glass-card p-4"} ${
              n.is_read ? "opacity-75" : "border-l-2 border-africhess-gold pl-3"
            }`}
          >
            <p className="font-medium leading-snug">{n.title}</p>
            {n.body && (
              <p
                className={`mt-1.5 opacity-85 whitespace-pre-wrap break-words ${
                  compact ? "text-sm" : "text-sm"
                }`}
              >
                {n.body}
              </p>
            )}
            <p className="text-[10px] opacity-40 mt-2">
              {new Date(n.created_at).toLocaleString()}
            </p>
            {action(n)}
          </li>
        ))}
      </ul>
    </>
  );
}
