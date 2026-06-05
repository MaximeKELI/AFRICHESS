"use client";

import Image from "next/image";
import clsx from "clsx";
import { getUserAvatarUrl, userInitials } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";

interface UserAvatarProps {
  avatar?: string | null;
  displayName?: string | null;
  username?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({
  avatar,
  displayName,
  username,
  size = 40,
  className,
}: UserAvatarProps) {
  const { t } = useTranslation();
  const src = getUserAvatarUrl(avatar);
  const initials = userInitials(displayName, username);

  if (src) {
    return (
      <span
        className={clsx("relative rounded-lg overflow-hidden shrink-0 ring-1 ring-africhess-gold/50", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={displayName || username || t("profile.player")}
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized={src.includes("localhost")}
        />
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-lg shrink-0 font-semibold text-white bg-gradient-to-br from-africhess-green to-africhess-gold ring-1 ring-africhess-gold/50",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
