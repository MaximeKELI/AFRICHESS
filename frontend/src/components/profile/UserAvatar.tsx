"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { getUserAvatarUrl, isLocalDevMediaUrl, userInitials } from "@/lib/avatars";
import { useTranslation } from "@/hooks/useTranslation";

interface UserAvatarProps {
  avatar?: string | null;
  avatarPreset?: string | null;
  displayName?: string | null;
  username?: string;
  size?: number;
  className?: string;
}

function InitialsAvatar({
  initials,
  size,
  className,
}: {
  initials: string;
  size: number;
  className?: string;
}) {
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

export function UserAvatar({
  avatar,
  avatarPreset,
  displayName,
  username,
  size = 40,
  className,
}: UserAvatarProps) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);
  const src = getUserAvatarUrl(broken ? null : avatar, avatarPreset);

  const initials = userInitials(displayName, username);

  if (src && !broken) {
    return (
      <span
        className={clsx(
          "relative rounded-lg overflow-hidden shrink-0 ring-1 ring-africhess-gold/50",
          className
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={displayName || username || t("profile.player")}
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized={isLocalDevMediaUrl(src)}
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return <InitialsAvatar initials={initials} size={size} className={className} />;
}
