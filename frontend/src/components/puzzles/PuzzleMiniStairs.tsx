"use client";

interface PuzzleMiniStairsProps {
  current: number;
  total: number;
  showError?: boolean;
  className?: string;
}

/** Escalier miniature persistant sous l'échiquier. */
export function PuzzleMiniStairs({ current, total, showError, className = "" }: PuzzleMiniStairsProps) {
  const visible = Math.min(Math.max(total, 5), 7);

  return (
    <div className={`puzzle-mini-stairs-wrap ${className}`} aria-hidden>
      <div className="puzzle-mini-stairs-scene">
        <div className="puzzle-mini-stairs">
          {Array.from({ length: visible }, (_, i) => {
            const step = i + 1;
            const done = step < current;
            const active = step === current;
            const err = active && showError;
            return (
              <div
                key={step}
                className={`puzzle-mini-step ${done ? "puzzle-mini-step-done" : ""} ${
                  active ? "puzzle-mini-step-active" : ""
                } ${err ? "puzzle-mini-step-error" : ""}`}
                style={{ "--mini-step": step, "--mini-total": visible } as React.CSSProperties}
              >
                <span className="puzzle-mini-step-num">{step}</span>
                {done && <span className="puzzle-mini-step-check">✓</span>}
                {err && <span className="puzzle-mini-step-x">✗</span>}
              </div>
            );
          })}
          <div
            className="puzzle-mini-pawn"
            style={{ "--mini-pawn-step": Math.max(0, current - 1) } as React.CSSProperties}
          >
            ♙
          </div>
        </div>
      </div>
      {total > 1 && (
        <p className="puzzle-mini-label text-center text-[10px] opacity-50 mt-1">
          {Math.min(current, total)} / {total}
        </p>
      )}
    </div>
  );
}
