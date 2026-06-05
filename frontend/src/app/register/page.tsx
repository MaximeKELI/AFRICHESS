"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { LevelPicker } from "@/components/profile/LevelPicker";
import type { ChessLevelId } from "@/lib/avatars";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    country: "SN",
    chess_level: "intermediate" as ChessLevelId,
  });
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailTaken(false);

    if (form.username.trim().length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (form.password !== form.password_confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      await register(form);
      router.push("/play");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Inscription échouée.";
      setError(msg);
      if (msg.includes("e-mail") && (msg.includes("déjà") || msg.includes("compte"))) {
        setEmailTaken(true);
      }
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-2 text-center">Rejoindre AFRICHESS</h1>
      <p className="text-center opacity-70 mb-8 text-sm">Créez votre profil de joueur africain</p>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        <LevelPicker
          value={form.chess_level}
          onChange={(chess_level) => setForm({ ...form, chess_level })}
        />
        <p className="text-xs opacity-50 -mt-2">
          Vous pourrez ajouter votre photo de profil plus tard. Les portraits illustrés
          (Amara, Kwame…) représentent les adversaires IA en partie.
        </p>

        <hr className="border-white/10" />

        <input
          type="text"
          placeholder="Nom d'utilisateur"
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
          minLength={3}
        />
        <input
          type="email"
          placeholder="E-mail"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe (8 caractères min.)"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
          minLength={8}
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          autoComplete="new-password"
          value={form.password_confirm}
          onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          required
          minLength={8}
        />
        <select
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
          aria-label="Pays"
        >
          <option value="SN">Sénégal</option>
          <option value="NG">Nigeria</option>
          <option value="EG">Égypte</option>
          <option value="ZA">Afrique du Sud</option>
          <option value="KE">Kenya</option>
          <option value="MA">Maroc</option>
          <option value="GH">Ghana</option>
          <option value="CI">Côte d&apos;Ivoire</option>
          <option value="CM">Cameroun</option>
          <option value="XX">Autre</option>
        </select>

        {error && (
          <div className="text-africhess-terracotta text-sm space-y-2" role="alert">
            <p>{error}</p>
            {emailTaken && (
              <p>
                <Link href="/login" className="text-africhess-gold underline font-medium">
                  → Se connecter avec ce compte
                </Link>
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 african-gradient text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? "Création du compte…" : "Créer mon compte"}
        </button>
        <OAuthButtons />
        <p className="text-center text-sm">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-africhess-gold underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
