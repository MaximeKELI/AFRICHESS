import * as Linking from "expo-linking";
import { API_ORIGIN } from "./api";

export function oauthRedirectUri(): string {
  return Linking.createURL("auth/callback");
}

export function oauthLoginUrl(provider: "google" | "github"): string {
  const redirect = encodeURIComponent(oauthRedirectUri());
  return `${API_ORIGIN}/accounts/${provider}/login/?next=${redirect}`;
}

export function parseOAuthCode(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}
