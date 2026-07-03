"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { AI_AVATARS, getAiAvatarSrc } from "@/lib/avatars";
import { UserAvatar } from "./UserAvatar";
import { useTranslation } from "@/hooks/useTranslation";

interface UserAvatarUploadProps {
  avatar?: string | null;
  avatarPreset?: string | null;
  displayName?: string | null;
  username?: string;
  onUpdated: () => void;
}

export function UserAvatarUpload({
  avatar,
  avatarPreset,
  displayName,
  username,
  onUpdated,
}: UserAvatarUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [presetSaving, setPresetSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activePreset = avatarPreset || "avatar-1";

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
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      await authApi.updateProfile(fd);
      setSuccess(t("profile.avatar.saved"));
      onUpdated();
    } catch (err) {
      setError(formatApiError(err, t("profile.avatar.error.upload")));
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = async (presetId: string) => {
    if (presetSaving || presetId === activePreset) return;
    setPresetSaving(presetId);
    setError(null);
    setSuccess(null);
    try {
      await authApi.updateProfile({ avatar_preset: presetId });
      setSuccess(t("profile.avatar.saved"));
      onUpdated();
    } catch (err) {
      setError(formatApiError(err, t("profile.avatar.error.upload")));
    } finally {
      setPresetSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{t("profile.avatar.title")}</p>
      <div className="flex items-center gap-4">
        <UserAvatar
          avatar={avatar}
          avatarPreset={avatarPreset}
          displayName={displayName}
          username={username}
          size={72}
        />
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

      <div>
        <p className="text-xs font-medium opacity-70 mb-2">{t("profile.avatar.presetTitle")}</p>
        <div className="flex flex-wrap gap-2">
          {AI_AVATARS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={Boolean(presetSaving)}
              onClick={() => selectPreset(preset.id)}
              className={clsx(
                "relative w-11 h-11 rounded-lg overflow-hidden ring-2 transition-all shrink-0",
                activePreset === preset.id
                  ? "ring-africhess-gold scale-105"
                  : "ring-white/15 hover:ring-africhess-gold/50 opacity-80 hover:opacity-100",
                presetSaving === preset.id && "opacity-50"
              )}
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={activePreset === preset.id}
            >
              <Image
                src={getAiAvatarSrc(preset.id)}
                alt=""
                fill
                className="object-cover"
                sizes="44px"
              />
            </button>
          ))}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {success && (
        <p className="text-xs text-africhess-green" role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="text-xs text-africhess-terracotta" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
