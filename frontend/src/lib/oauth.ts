import { API_ORIGIN } from "@/lib/apiConfig";

/** Origine API sans suffixe /api (flux OAuth allauth). */
export { API_ORIGIN };

export function oauthLoginUrl(provider: "google" | "github"): string {
  return `${API_ORIGIN}/accounts/${provider}/login/`;
}

export const oauthConfigured =
  process.env.NEXT_PUBLIC_OAUTH_ENABLED === "1" ||
  process.env.NEXT_PUBLIC_OAUTH_ENABLED === "true";
