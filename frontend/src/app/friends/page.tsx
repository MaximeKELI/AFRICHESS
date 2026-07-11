"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { socialApi, gamesApi, type GameChallenge } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { UserSearchBar } from "@/components/social/UserSearchBar";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { defaultPresetForMode, playModeFromPreset, type TimePresetId } from "@/lib/timeControl";

interface UserPublic {
  id: number;
  username: string;
  display_name: string;
  country: string;
  avatar?: string | null;
  avatar_preset?: string | null;
}

interface Friendship {
  id: number;
  from_user: UserPublic;
  to_user: UserPublic;
  status: string;
}

function FriendsContent() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addFromUrl = searchParams.get("add");
  const dmFromUrl = searchParams.get("dm");

  const [friends, setFriends] = useState<UserPublic[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [gameChallenges, setGameChallenges] = useState<GameChallenge[]>([]);
  const [username, setUsername] = useState(addFromUrl || "");
  const [mode, setMode] = useState("blitz");
  const [timePreset, setTimePreset] = useState<TimePresetId>(() => defaultPresetForMode("blitz"));
  const [odds, setOdds] = useState("none");
  const [msg, setMsg] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (dmFromUrl) {
      router.replace(`/messages/${encodeURIComponent(dmFromUrl)}`);
    }
  }, [dmFromUrl, router]);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([
      socialApi.friends(),
      socialApi.pendingFriends(),
      socialApi.sentFriends(),
      gamesApi.pendingChallenges().catch(() => ({ data: [] as GameChallenge[] })),
    ])
      .then(([friendsRes, pendingRes, sentRes, challengesRes]) => {
        const list: Friendship[] = Array.isArray(friendsRes.data) ? friendsRes.data : [];
        const users = list.map((f) =>
          f.from_user.id === user?.id ? f.to_user : f.from_user
        );
        setFriends(users);
        setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
        setSent(Array.isArray(sentRes.data) ? sentRes.data : []);
        const ch = challengesRes.data;
        setGameChallenges(Array.isArray(ch) ? ch : []);
      })
      .catch((err) => {
        setFriends([]);
        setPending([]);
        setSent([]);
        setGameChallenges([]);
        setLoadError(formatApiError(err, t("friends.error.load")));
      });
  }, [user?.id, t]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  useEffect(() => {
    if (addFromUrl) setUsername(addFromUrl);
  }, [addFromUrl]);

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

  if (dmFromUrl) {
    return (
      <p className="max-w-4xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>
    );
  }

  const addFriend = async () => {
    setMsg("");
    try {
      await socialApi.requestFriend(username.trim());
      setMsg(t("friends.add.sent"));
      setUsername("");
      load();
    } catch {
      setMsg(t("friends.add.failed"));
    }
  };

  const accept = async (id: number) => {
    await socialApi.acceptFriend(id);
    load();
  };

  const decline = async (id: number) => {
    await socialApi.declineFriend(id);
    load();
  };

  const acceptGameChallenge = async (id: number) => {
    try {
      const { data } = await gamesApi.acceptChallenge(id);
      const gameId = data.game?.id ?? data.challenge?.game_id;
      if (gameId) {
        router.push(`/play?game=${gameId}`);
        return;
      }
      setMsg(t("friends.gameChallenge.accepted"));
      load();
    } catch (err) {
      setMsg(formatApiError(err, t("friends.gameChallenge.acceptFailed")));
    }
  };

  const declineGameChallenge = async (id: number) => {
    try {
      await gamesApi.declineChallenge(id);
      setMsg(t("friends.gameChallenge.declined"));
      load();
    } catch (err) {
      setMsg(formatApiError(err, t("friends.gameChallenge.declineFailed")));
    }
  };

  const cancelSent = async (id: number) => {
    await socialApi.cancelFriendRequest(id);
    load();
  };

  const unfriend = async (name: string) => {
    if (!window.confirm(t("social.friend.unfriendConfirm"))) return;
    await socialApi.unfriend(name);
    load();
  };

  const challenge = async (name: string) => {
    setMsg("");
    try {
      const playMode = playModeFromPreset(timePreset);
      const opts: { odds?: string; time_control: string; is_timed: boolean; is_rated: boolean } = {
        time_control: timePreset,
        is_timed: true,
        is_rated: false,
      };
      if (odds !== "none") opts.odds = odds;
      await socialApi.challengeFriend(name, playMode, opts);
      setMsg(t("friends.challenge.sent"));
    } catch {
      setMsg(t("friends.challenge.failed"));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold">{t("friends.title")}</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/messages" className="text-africhess-gold hover:underline">
            {t("friends.messages.title")}
          </Link>
          <Link href="/users/search" className="text-africhess-gold hover:underline">
            {t("social.search.title")}
          </Link>
        </div>
      </div>

      {loadError && (
        <InlineAlert className="mb-4" onDismiss={() => setLoadError(null)}>
          {loadError}
        </InlineAlert>
      )}

      <div className="glass-card p-4 mb-6 relative overflow-visible">
        <h2 className="font-semibold mb-3">{t("social.search.title")}</h2>
        <UserSearchBar compact />
      </div>

      <div className="glass-card p-4 mb-6">
        <h2 className="font-semibold mb-3">{t("friends.add.title")}</h2>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("friends.add.placeholder")}
            className="flex-1 border rounded-lg px-3 py-2 bg-transparent"
          />
          <button
            type="button"
            onClick={addFriend}
            className="px-4 py-2 rounded-lg african-gradient text-white"
          >
            {t("friends.add.button")}
          </button>
        </div>
        {msg && <p className="text-sm text-africhess-gold mt-2">{msg}</p>}
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h2 className="font-semibold mb-3">{t("friends.pending.title")}</h2>
          <ul className="space-y-2">
            {pending.map((f) => (
              <li key={f.id} className="flex justify-between items-center gap-2">
                <Link
                  href={`/profile/${f.from_user.username}`}
                  className="hover:text-africhess-gold truncate"
                >
                  {f.from_user.display_name || f.from_user.username}
                </Link>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => accept(f.id)}
                    className="text-sm px-3 py-1 rounded-lg border border-africhess-green text-africhess-green"
                  >
                    {t("friends.pending.accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => decline(f.id)}
                    className="text-sm px-3 py-1 rounded-lg border opacity-70"
                  >
                    {t("social.friend.decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gameChallenges.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h2 className="font-semibold mb-3">{t("friends.gameChallenge.title")}</h2>
          <ul className="space-y-2">
            {gameChallenges.map((c) => (
              <li key={c.id} className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/profile/${c.challenger.username}`}
                    className="hover:text-africhess-gold font-medium truncate block"
                  >
                    {c.challenger.display_name || c.challenger.username}
                  </Link>
                  <p className="text-xs opacity-60">
                    {c.mode}
                    {c.time_control ? ` · ${c.time_control}` : ""}
                    {c.is_rated ? ` · ${t("friends.gameChallenge.rated")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => acceptGameChallenge(c.id)}
                    className="text-sm px-3 py-1 rounded-lg african-gradient text-white"
                  >
                    {t("friends.pending.accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => declineGameChallenge(c.id)}
                    className="text-sm px-3 py-1 rounded-lg border opacity-70"
                  >
                    {t("social.friend.decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sent.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h2 className="font-semibold mb-3">{t("social.friend.sentTitle")}</h2>
          <ul className="space-y-2">
            {sent.map((f) => (
              <li key={f.id} className="flex justify-between items-center gap-2">
                <Link
                  href={`/profile/${f.to_user.username}`}
                  className="hover:text-africhess-gold truncate"
                >
                  {f.to_user.display_name || f.to_user.username}
                </Link>
                <button
                  type="button"
                  onClick={() => cancelSent(f.id)}
                  className="text-sm px-3 py-1 rounded-lg border opacity-70 shrink-0"
                >
                  {t("social.friend.cancel")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-card p-4">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h2 className="font-semibold">{t("friends.list.title", { count: friends.length })}</h2>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setTimePreset(defaultPresetForMode(e.target.value));
            }}
            className="text-sm border rounded-lg px-2 py-1 bg-transparent"
          >
            <option value="bullet">{t("modes.bullet")}</option>
            <option value="blitz">{t("modes.blitz")}</option>
            <option value="rapid">{t("modes.rapid")}</option>
            <option value="classical">{t("modes.classical")}</option>
          </select>
          <select
            value={timePreset}
            onChange={(e) => setTimePreset(e.target.value as TimePresetId)}
            className="text-sm border rounded-lg px-2 py-1 bg-transparent"
            title={t("time.title")}
          >
            <option value="1+0">1+0</option>
            <option value="3+2">3+2</option>
            <option value="5+0">5+0</option>
            <option value="10+0">10+0</option>
            <option value="15+10">15+10</option>
            <option value="30+0">30+0</option>
            <option value="60+0">60+0</option>
          </select>
          <select
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1 bg-transparent"
            title={t("friends.odds.label")}
          >
            <option value="none">{t("friends.odds.none")}</option>
            <option value="knight">{t("friends.odds.knight")}</option>
            <option value="bishop">{t("friends.odds.bishop")}</option>
            <option value="rook">{t("friends.odds.rook")}</option>
            <option value="queen">{t("friends.odds.queen")}</option>
          </select>
        </div>
        {friends.length === 0 ? (
          <p className="opacity-60 text-sm">{t("friends.list.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.id}
                className="flex justify-between items-center p-2 rounded-lg gap-2"
              >
                <Link
                  href={`/profile/${f.username}`}
                  className="text-left flex-1 min-w-0 hover:text-africhess-gold flex items-center gap-2"
                >
                  <UserAvatar
                    avatar={f.avatar}
                    avatarPreset={f.avatar_preset}
                    displayName={f.display_name}
                    username={f.username}
                    size={32}
                  />
                  <span className="font-medium truncate">{f.display_name || f.username}</span>
                  {f.country && (
                    <span className="text-xs opacity-60 ml-2">{f.country}</span>
                  )}
                </Link>
                <div className="flex gap-1 shrink-0">
                  <Link
                    href={`/messages/${encodeURIComponent(f.username)}`}
                    className="text-sm px-3 py-1 rounded-lg border hover:border-africhess-gold"
                  >
                    {t("social.message")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => challenge(f.username)}
                    className="text-sm px-3 py-1 rounded-lg african-gradient text-white"
                  >
                    {t("friends.challenge")}
                  </button>
                  <button
                    type="button"
                    onClick={() => unfriend(f.username)}
                    className="text-xs px-2 py-1 rounded-lg border opacity-50"
                    title={t("social.friend.unfriend")}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<p className="max-w-4xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>}>
      <FriendsContent />
    </Suspense>
  );
}
