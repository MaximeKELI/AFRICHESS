"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { oauthLoginUrl } from "@/lib/oauth";
import { useTranslation } from "@/hooks/useTranslation";

export function OAuthButtons() {
  const { t } = useTranslation();
  const [oauth, setOauth] = useState<{ google: boolean; github: boolean } | null>(null);

  useEffect(() => {
    api
      .get("/users/subscription/plans/")
      .then(({ data }) => setOauth(data.oauth ?? { google: false, github: false }))
      .catch(() => setOauth({ google: false, github: false }));
  }, []);

  const configured = oauth && (oauth.google || oauth.github);

  return (
    <div className="space-y-2 pt-2 border-t border-white/10">
      <p className="text-xs text-center opacity-60">{t("auth.oauth.or")}</p>
      {(oauth?.google ?? true) && (
        <a
          href={oauthLoginUrl("google")}
          className="w-full block text-center py-2.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm"
        >
          Google
        </a>
      )}
      {(oauth?.github ?? true) && (
        <a
          href={oauthLoginUrl("github")}
          className="w-full block text-center py-2.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm"
        >
          GitHub
        </a>
      )}
      {!configured && (
        <p className="text-[10px] text-center opacity-40">{t("auth.oauth.config")}</p>
      )}
    </div>
  );
}
