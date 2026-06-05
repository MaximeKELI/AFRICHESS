"use client";

import { oauthLoginUrl } from "@/lib/oauth";
import { useTranslation } from "@/hooks/useTranslation";

export function OAuthButtons() {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 pt-2 border-t border-white/10">
      <p className="text-xs text-center opacity-60">{t("auth.oauth.or")}</p>
      <a
        href={oauthLoginUrl("google")}
        className="w-full block text-center py-2.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm"
      >
        Google
      </a>
      <a
        href={oauthLoginUrl("github")}
        className="w-full block text-center py-2.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm"
      >
        GitHub
      </a>
      <p className="text-[10px] text-center opacity-40">{t("auth.oauth.config")}</p>
    </div>
  );
}
