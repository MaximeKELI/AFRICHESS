"use client";

import { useRef, useState } from "react";
import { authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { UserAvatar } from "./UserAvatar";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image trop lourde (max 2 Mo).");
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
      setError(formatApiError(err, "Impossible d'envoyer la photo."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium mb-3">Votre photo de profil</p>
      <div className="flex items-center gap-4">
        <UserAvatar avatar={avatar} displayName={displayName} username={username} size={72} />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm px-4 py-2 rounded-lg border border-africhess-gold text-africhess-gold hover:bg-africhess-gold/10 disabled:opacity-50"
          >
            {uploading ? "Envoi…" : "Choisir une photo"}
          </button>
          <p className="text-xs opacity-50">
            Les portraits Amara, Kwame, etc. sont réservés aux adversaires IA.
          </p>
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
