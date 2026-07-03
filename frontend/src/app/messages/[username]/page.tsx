"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usersApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { DirectMessagePanel } from "@/components/social/DirectMessagePanel";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export default function DirectMessagePage() {
  const params = useParams();
  const username = decodeURIComponent(String(params.username || ""));
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(username);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    usersApi
      .get(username)
      .then(({ data }) => setDisplayName(data.display_name || data.username))
      .catch((err) => setError(formatApiError(err, t("profile.public.error"))))
      .finally(() => setLoading(false));
  }, [username, t]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("friends.loginRequired")}</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  if (user.username === username) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center opacity-70">
        <p>{t("friends.messages.select")}</p>
        <Link href="/messages" className="text-africhess-gold text-sm mt-4 inline-block hover:underline">
          {t("friends.messages.title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 min-h-[calc(100vh-5rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/messages" className="text-sm text-africhess-gold hover:underline shrink-0">
          ← {t("friends.messages.title")}
        </Link>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <InlineAlert>{error}</InlineAlert>
      ) : (
        <div className="glass-card p-5 flex-1 flex flex-col min-h-0">
          <h1 className="sr-only">{t("friends.messages.with", { name: displayName })}</h1>
          <DirectMessagePanel
            username={username}
            displayName={displayName}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}
