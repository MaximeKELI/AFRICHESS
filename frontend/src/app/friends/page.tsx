"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";

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

export default function FriendsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [friends, setFriends] = useState<UserPublic[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("blitz");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    socialApi.friends().then(({ data }) => {
      const list: Friendship[] = Array.isArray(data) ? data : [];
      const users = list.map((f) =>
        f.from_user.id === user?.id ? f.to_user : f.from_user
      );
      setFriends(users);
    });
    socialApi.pendingFriends().then(({ data }) => {
      setPending(Array.isArray(data) ? data : []);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">Connectez-vous pour gérer vos amis.</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">
          Connexion
        </Link>
      </div>
    );
  }

  const addFriend = async () => {
    setMsg("");
    try {
      await socialApi.requestFriend(username.trim());
      setMsg("Demande envoyée");
      setUsername("");
    } catch {
      setMsg("Joueur introuvable ou déjà ami");
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
      setMsg("Impossible d'envoyer le défi");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Amis & défis</h1>

      <div className="glass-card p-4 mb-6">
        <h2 className="font-semibold mb-3">Ajouter un ami</h2>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            className="flex-1 border rounded-lg px-3 py-2 bg-transparent"
          />
          <button
            type="button"
            onClick={addFriend}
            className="px-4 py-2 rounded-lg african-gradient text-white"
          >
            Ajouter
          </button>
        </div>
        {msg && <p className="text-sm text-africhess-gold mt-2">{msg}</p>}
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h2 className="font-semibold mb-3">Demandes reçues</h2>
          <ul className="space-y-2">
            {pending.map((f) => (
              <li key={f.id} className="flex justify-between items-center">
                <span>{f.from_user.display_name || f.from_user.username}</span>
                <button
                  type="button"
                  onClick={() => accept(f.id)}
                  className="text-sm px-3 py-1 rounded-lg border border-africhess-green text-africhess-green"
                >
                  Accepter
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Mes amis ({friends.length})</h2>
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
          <p className="opacity-60 text-sm">Aucun ami pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-3">
            {friends.map((f) => (
              <li key={f.id} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{f.display_name || f.username}</span>
                  {f.country && (
                    <span className="text-xs opacity-60 ml-2">{f.country}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => challenge(f.username)}
                  className="text-sm px-4 py-1.5 rounded-lg african-gradient text-white"
                >
                  Défier
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
