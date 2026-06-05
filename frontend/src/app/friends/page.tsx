"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface UserPublic {
  id: number;
  username: string;
  display_name: string;
  country: string;
}

interface Friendship {
  id: number;
  from_user: UserPublic;
  to_user: UserPublic;
  status: string;
}

interface ChatMsg {
  id: number;
  sender: UserPublic;
  content: string;
  created_at: string;
}

export default function FriendsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const [friends, setFriends] = useState<UserPublic[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("blitz");
  const [msg, setMsg] = useState("");
  const [dmUser, setDmUser] = useState<UserPublic | null>(null);
  const [dmMessages, setDmMessages] = useState<ChatMsg[]>([]);
  const [dmText, setDmText] = useState("");
  const [dmLoading, setDmLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([socialApi.friends(), socialApi.pendingFriends()])
      .then(([friendsRes, pendingRes]) => {
        const list: Friendship[] = Array.isArray(friendsRes.data) ? friendsRes.data : [];
        const users = list.map((f) =>
          f.from_user.id === user?.id ? f.to_user : f.from_user
        );
        setFriends(users);
        setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      })
      .catch((err) => {
        setFriends([]);
        setPending([]);
        setLoadError(formatApiError(err, t("friends.error.load")));
      });
  }, [user?.id]);

  const loadDm = useCallback(
    (friend: UserPublic) => {
      setDmLoading(true);
      socialApi
        .directMessages(friend.username)
        .then(({ data }) => setDmMessages(Array.isArray(data) ? data : []))
        .catch((err) => {
          setDmMessages([]);
          setMsg(formatApiError(err, "Impossible de charger les messages."));
        })
        .finally(() => setDmLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  useEffect(() => {
    if (dmUser) loadDm(dmUser);
  }, [dmUser, loadDm]);

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

  const addFriend = async () => {
    setMsg("");
    try {
      await socialApi.requestFriend(username.trim());
      setMsg(t("friends.add.sent"));
      setUsername("");
    } catch {
      setMsg(t("friends.add.failed"));
    }
  };

  const accept = async (id: number) => {
    await socialApi.acceptFriend(id);
    load();
  };

  const challenge = async (name: string) => {
    setMsg("");
    try {
      const { data } = await socialApi.challengeFriend(name, mode);
      router.push(`/play?game=${data.id}&mode=${mode}`);
    } catch {
      setMsg(t("friends.challenge.failed"));
    }
  };

  const sendDm = async () => {
    if (!dmUser || !dmText.trim()) return;
    try {
      await socialApi.sendDirectMessage(dmUser.username, dmText.trim());
      setDmText("");
      loadDm(dmUser);
    } catch {
      setMsg(t("friends.message.failed"));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">{t("friends.title")}</h1>
      {loadError && (
        <InlineAlert className="mb-4" onDismiss={() => setLoadError(null)}>
          {loadError}
        </InlineAlert>
      )}

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
              <li key={f.id} className="flex justify-between items-center">
                <span>{f.from_user.display_name || f.from_user.username}</span>
                <button
                  type="button"
                  onClick={() => accept(f.id)}
                  className="text-sm px-3 py-1 rounded-lg border border-africhess-green text-africhess-green"
                >
                  {t("friends.pending.accept")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">{t("friends.list.title", { count: friends.length })}</h2>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1 bg-transparent"
            >
              <option value="bullet">Bullet</option>
              <option value="blitz">Blitz</option>
              <option value="rapid">Rapide</option>
            </select>
          </div>
          {friends.length === 0 ? (
            <p className="opacity-60 text-sm">{t("friends.list.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className={`flex justify-between items-center p-2 rounded-lg ${
                    dmUser?.id === f.id ? "bg-africhess-gold/10" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setDmUser(f)}
                    className="text-left flex-1"
                  >
                    <span className="font-medium">{f.display_name || f.username}</span>
                    {f.country && (
                      <span className="text-xs opacity-60 ml-2">{f.country}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => challenge(f.username)}
                    className="text-sm px-3 py-1 rounded-lg african-gradient text-white ml-2"
                  >
                    {t("friends.challenge")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-4 flex flex-col min-h-[320px]">
          <h2 className="font-semibold mb-3">
            {dmUser
              ? t("friends.messages.with", { name: dmUser.display_name || dmUser.username })
              : t("friends.messages.title")}
          </h2>
          {!dmUser ? (
            <p className="text-sm opacity-60">{t("friends.messages.select")}</p>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64 border border-white/10 rounded-lg p-3">
                {dmLoading ? (
                  <p className="text-xs opacity-50">{t("common.loading")}</p>
                ) : dmMessages.length === 0 ? (
                  <p className="text-xs opacity-50">{t("friends.messages.empty")}</p>
                ) : (
                  dmMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm ${
                        m.sender.id === user.id ? "text-right" : ""
                      }`}
                    >
                      <span className="text-[10px] opacity-50 block">
                        {m.sender.username}
                      </span>
                      <span className="inline-block px-2 py-1 rounded bg-white/5">
                        {m.content}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendDm()}
                  placeholder={t("friends.messages.placeholder")}
                  className="flex-1 border rounded-lg px-3 py-2 bg-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={sendDm}
                  className="px-4 py-2 rounded-lg african-gradient text-white text-sm"
                >
                  Envoyer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
