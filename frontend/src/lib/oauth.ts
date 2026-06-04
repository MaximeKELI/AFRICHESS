/** Origine API sans suffixe /api (flux OAuth allauth). */
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(
    /\/api\/?$/,
    ""
  );

export function oauthLoginUrl(provider: "google" | "github"): string {
  return `${API_ORIGIN}/accounts/${provider}/login/`;
}

export const oauthConfigured =
  process.env.NEXT_PUBLIC_OAUTH_ENABLED === "1" ||
  process.env.NEXT_PUBLIC_OAUTH_ENABLED === "true";
