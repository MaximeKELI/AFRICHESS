"use client";

import { useRef, useState } from "react";
import { authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { UserAvatar } from "./UserAvatar";
import { useTranslation } from "@/hooks/useTranslation";

interface UserAvatarUploadProps {
  avatar?: string | null;
  displayName?: string | null;
  username?: string;
  onUpdated: () => void;
}

export function UserAvatarUpload({
  avatar,
  displayName,
  username,
  onUpdated,
}: UserAvatarUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(t("profile.avatar.error.type"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("profile.avatar.error.size"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      await authApi.updateProfile(fd);
      onUpdated();
    } catch (err) {
      setError(formatApiError(err, t("profile.avatar.error.upload")));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium mb-3">{t("profile.avatar.title")}</p>
      <div className="flex items-center gap-4">
        <UserAvatar avatar={avatar} displayName={displayName} username={username} size={72} />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm px-4 py-2 rounded-lg border border-africhess-gold text-africhess-gold hover:bg-africhess-gold/10 disabled:opacity-50"
          >
            {uploading ? t("profile.avatar.uploading") : t("profile.avatar.choose")}
          </button>
          <p className="text-xs opacity-50">{t("profile.avatar.hint2")}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="text-xs text-africhess-terracotta mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
