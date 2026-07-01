"use client";

interface PuzzleProgressRailProps {
  current: number;
  total: number;
  className?: string;
}

/** Barre de progression type Chess.com — N / total avec pastilles. */
export function PuzzleProgressRail({ current, total, className = "" }: PuzzleProgressRailProps) {
  if (total <= 1) return null;

  return (
    <div className={`puzzle-fx-rail ${className}`} aria-hidden>
      <div className="puzzle-fx-rail-dots">
        {Array.from({ length: total }, (_, i) => {
          const idx = i + 1;
          const done = idx < current;
          const active = idx === current;
          return (
            <span
              key={i}
              className={`puzzle-fx-rail-dot ${done ? "puzzle-fx-rail-dot-done" : ""} ${
                active ? "puzzle-fx-rail-dot-active" : ""
              }`}
            />
          );
        })}
      </div>
      <div className="puzzle-fx-rail-track">
        <div
          className="puzzle-fx-rail-fill"
          style={{ width: `${Math.min(100, ((current - 1) / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}
