"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { badgeById, type PuzzleBadgeId } from "@/lib/puzzleBadges";

interface PuzzleBadgeToastProps {
  badgeIds: PuzzleBadgeId[];
  onDone?: () => void;
}

export function PuzzleBadgeToast({ badgeIds, onDone }: PuzzleBadgeToastProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!badgeIds.length) return;
    setVisible(true);
    const tmr = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3200);
    return () => window.clearTimeout(tmr);
  }, [badgeIds, onDone]);

  if (!visible || !badgeIds.length) return null;

  return (
    <div className="puzzle-badge-toast" role="status">
      {badgeIds.map((id) => {
        const b = badgeById(id);
        if (!b) return null;
        return (
          <div key={id} className="puzzle-badge-toast-item">
            <span className="text-2xl" aria-hidden>{b.emoji}</span>
            <div>
              <p className="font-semibold text-sm">{t(b.labelKey)}</p>
              <p className="text-xs opacity-70">{t(b.descKey)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
