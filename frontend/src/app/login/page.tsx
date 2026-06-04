"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects.");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold mb-8 text-center">Connexion</h1>
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
        <input
          type="text"
          placeholder="Nom d'utilisateur (ex. DKELI)"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
        />
        {error && (
          <p className="text-africhess-terracotta text-sm" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 african-gradient text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? "Connexion…" : "Se connecter"}
        </button>
        <OAuthButtons />
        <p className="text-center text-xs opacity-70">
          Si votre e-mail a déjà un compte, utilisez le nom d&apos;utilisateur choisi à l&apos;inscription,
          pas l&apos;e-mail seul.
        </p>
        <p className="text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-africhess-gold underline">
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </div>
  );
}
