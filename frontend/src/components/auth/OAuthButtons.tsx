"use client";

import { oauthLoginUrl } from "@/lib/oauth";

export function OAuthButtons() {
  return (
    <div className="space-y-2 pt-2 border-t border-white/10">
      <p className="text-xs text-center opacity-60">ou continuer avec</p>
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
      <p className="text-[10px] text-center opacity-40">
        Configurez GOOGLE_OAUTH_* / GITHUB_OAUTH_* sur le serveur
      </p>
    </div>
  );
}
