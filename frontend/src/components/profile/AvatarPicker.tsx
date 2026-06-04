"use client";

import Image from "next/image";
import { AVATARS, type AvatarId } from "@/lib/avatars";
import { clsx } from "clsx";

interface AvatarPickerProps {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div>
      <p className="text-sm font-medium mb-3">Choisissez votre avatar</p>
      <div className="grid grid-cols-4 gap-3">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onChange(avatar.id)}
            className={clsx(
              "relative aspect-square rounded-xl overflow-hidden ring-2 transition-all hover:scale-105",
              value === avatar.id
                ? "ring-africhess-gold shadow-lg shadow-africhess-gold/30"
                : "ring-transparent hover:ring-white/30"
            )}
            aria-label={`Avatar ${avatar.name}`}
            aria-pressed={value === avatar.id}
          >
            <Image
              src={avatar.src}
              alt={avatar.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
