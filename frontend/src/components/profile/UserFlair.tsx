"use client";

/** Badge emoji affiché à côté du pseudo */
export function UserFlair({ flair, className = "" }: { flair?: string | null; className?: string }) {
  if (!flair) return null;
  return (
    <span className={`inline-block ${className}`} title="Flair" aria-hidden="true">
      {flair}
    </span>
  );
}
