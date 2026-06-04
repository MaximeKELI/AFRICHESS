"use client";

interface Tip {
  category: string;
  message: string;
  priority: number;
}

export function CoachPanel({ tips }: { tips: Tip[] }) {
  if (!tips.length) return null;

  return (
    <div className="glass-card p-5">
      <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
        <span>🎯</span> Coach AFRICHESS
      </h2>
      <ul className="space-y-3">
        {tips.map((t, i) => (
          <li
            key={i}
            className="text-sm p-3 rounded-lg bg-white/5 border-l-2 border-africhess-gold"
          >
            <span className="text-xs uppercase opacity-50 block mb-1">{t.category}</span>
            {t.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
