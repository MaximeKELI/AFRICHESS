"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    country: "SN",
  });
  const [error, setError] = useState("");
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await register(form);
      router.push("/play");
    } catch {
      setError("Registration failed");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold mb-8 text-center">Join AFRICHESS</h1>
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
        {["username", "email", "password", "password_confirm"].map((field) => (
          <input
            key={field}
            type={field.includes("password") ? "password" : field === "email" ? "email" : "text"}
            placeholder={field.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            value={form[field as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border bg-transparent"
            required
          />
        ))}
        <select
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border bg-transparent"
        >
          <option value="SN">Senegal</option>
          <option value="NG">Nigeria</option>
          <option value="EG">Egypt</option>
          <option value="ZA">South Africa</option>
          <option value="KE">Kenya</option>
          <option value="MA">Morocco</option>
          <option value="GH">Ghana</option>
          <option value="CI">Côte d'Ivoire</option>
          <option value="CM">Cameroon</option>
          <option value="XX">Other</option>
        </select>
        {error && <p className="text-africhess-terracotta text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 african-gradient text-white rounded-lg font-medium"
        >
          Create Account
        </button>
        <p className="text-center text-sm">
          Already have an account? <Link href="/login" className="text-africhess-gold underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
