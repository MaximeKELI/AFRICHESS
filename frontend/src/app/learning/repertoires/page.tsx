"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

interface RepLine {
  id: number;
  name: string;
  moves_san: string[];
}

interface Repertoire {
  id: number;
  name: string;
  color: string;
  lines: RepLine[];
}

export default function RepertoiresPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [reps, setReps] = useState<Repertoire[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("white");
  const [lineName, setLineName] = useState("");
  const [lineMoves, setLineMoves] = useState("");
  const [activeRep, setActiveRep] = useState<number | null>(null);

  const load = () => {
    learningApi.repertoires().then(({ data }) => setReps(Array.isArray(data) ? data : [])).catch(() => setReps([]));
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const create = async () => {
    await learningApi.createRepertoire(name || t("repertoire.defaultName"), color);
    setName("");
    load();
  };

  const addLine = async () => {
    if (!activeRep || !lineMoves.trim()) return;
    const moves = lineMoves.split(/\s+/).filter(Boolean);
    await learningApi.addRepertoireLine(activeRep, lineName || t("repertoire.defaultLine"), moves);
    setLineName("");
    setLineMoves("");
    load();
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p>{t("repertoire.loginRequired")}</p>
        <Link href="/login" className="text-africhess-gold underline">{t("nav.login")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/learning/openings" className="text-sm text-africhess-gold hover:underline">← {t("nav.openings")}</Link>
      <h1 className="font-display text-3xl font-bold">{t("repertoire.title")}</h1>

      <div className="glass-card p-4 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("repertoire.name")} className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border bg-transparent text-sm" />
        <select value={color} onChange={(e) => setColor(e.target.value)} className="px-3 py-2 rounded-lg border bg-transparent text-sm">
          <option value="white">{t("repertoire.white")}</option>
          <option value="black">{t("repertoire.black")}</option>
        </select>
        <button type="button" onClick={create} className="px-4 py-2 african-gradient text-white rounded-lg text-sm">{t("repertoire.create")}</button>
      </div>

      {reps.map((r) => (
        <div key={r.id} className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">{r.name} <span className="text-xs opacity-50">({r.color})</span></h2>
          <ul className="text-sm space-y-1">
            {r.lines.map((ln) => (
              <li key={ln.id} className="font-mono opacity-80">{ln.name}: {ln.moves_san.join(" ")}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input value={activeRep === r.id ? lineName : ""} onFocus={() => setActiveRep(r.id)} onChange={(e) => { setActiveRep(r.id); setLineName(e.target.value); }} placeholder={t("repertoire.lineName")} className="flex-1 min-w-[100px] px-2 py-1 rounded border bg-transparent text-xs" />
            <input value={activeRep === r.id ? lineMoves : ""} onFocus={() => setActiveRep(r.id)} onChange={(e) => { setActiveRep(r.id); setLineMoves(e.target.value); }} placeholder="e4 e5 Nf3" className="flex-[2] min-w-[160px] px-2 py-1 rounded border bg-transparent text-xs font-mono" />
            <button type="button" onClick={() => { setActiveRep(r.id); addLine(); }} className="px-3 py-1 text-xs border rounded-lg">{t("repertoire.addLine")}</button>
          </div>
        </div>
      ))}

      {reps.length === 0 && <p className="text-sm opacity-60">{t("repertoire.empty")}</p>}
    </div>
  );
}
