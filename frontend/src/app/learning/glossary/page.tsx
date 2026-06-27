"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

const TERMS = [
  { term: "Échec", def: "Le roi est attaqué et doit se mettre à l'abri." },
  { term: "Mat", def: "Le roi est en échec sans coup légal pour s'échapper." },
  { term: "Pat", def: "Le joueur au trait n'a aucun coup légal mais son roi n'est pas en échec — partie nulle." },
  { term: "Roque", def: "Déplacement simultané du roi et d'une tour (petit ou grand roque)." },
  { term: "En passant", def: "Capture spéciale d'un pion qui vient d'avancer de deux cases." },
  { term: "Promotion", def: "Un pion atteignant la dernière rangée devient dame, tour, fou ou cavalier." },
  { term: "Fourchette", def: "Une pièce attaque deux pièces adverses en même temps." },
  { term: "Clouage", def: "Une pièce ne peut bouger sans exposer une pièce de plus grande valeur." },
  { term: "Enfilade", def: "Attaque alignée sur une pièce qui masque une autre derrière elle." },
  { term: "Combinaison", def: "Suite forcée de coups tactiques menant à un gain matériel ou au mat." },
  { term: "Ouverture", def: "Phase initiale de la partie (environ les 10–15 premiers coups)." },
  { term: "Milieu de jeu", def: "Phase où les pièces sont développées et les plans se déploient." },
  { term: "Finale", def: "Phase avec peu de pièces ; le roi devient actif." },
  { term: "Zugzwang", def: "Situation où jouer un coup aggrave la position." },
  { term: "Gambit", def: "Sacrifice de matériel en ouverture pour obtenir l'initiative." },
  { term: "ELO", def: "Système de classement basé sur les résultats contre d'autres joueurs." },
  { term: "Cadence", def: "Temps imparti par joueur (bullet, blitz, rapide, classique, daily)." },
  { term: "PGN", def: "Portable Game Notation — format standard d'enregistrement des parties." },
  { term: "FEN", def: "Notation qui décrit une position exacte sur l'échiquier." },
  { term: "Accuracy", def: "Pourcentage de coups proches du meilleur coup moteur (analyse post-partie)." },
] as const;

export default function GlossaryPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  const filtered = TERMS.filter(
    (item) =>
      item.term.toLowerCase().includes(q.toLowerCase()) ||
      item.def.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.learn")}
      </Link>
      <h1 className="font-display text-3xl font-bold mt-4 mb-2">{t("glossary.title")}</h1>
      <p className="text-sm opacity-70 mb-6">{t("glossary.subtitle")}</p>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("glossary.search")}
        className="w-full px-4 py-3 rounded-lg border bg-transparent mb-6"
        aria-label={t("glossary.search")}
      />
      <dl className="space-y-4">
        {filtered.map(({ term, def }) => (
          <div key={term} className="glass-card p-4">
            <dt className="font-semibold text-africhess-gold">{term}</dt>
            <dd className="text-sm opacity-80 mt-1">{def}</dd>
          </div>
        ))}
      </dl>
      {filtered.length === 0 && (
        <p className="text-sm opacity-50 text-center">{t("glossary.empty")}</p>
      )}
    </div>
  );
}
