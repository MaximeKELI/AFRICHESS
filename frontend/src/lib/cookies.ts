import Cookies from "js-cookie";
import { JWT_REFRESH_HTTPONLY } from "@/lib/authConfig";

const isProd = process.env.NODE_ENV === "production";

export const authCookieOptions = {
  sameSite: "strict" as const,
  secure: isProd,
};

export function setAccessToken(token: string) {
  // Aligné sur ACCESS_TOKEN_LIFETIME backend (1 h)
  Cookies.set("access_token", token, { ...authCookieOptions, expires: 1 });
}

export function setRefreshToken(token: string | undefined) {
  if (JWT_REFRESH_HTTPONLY || !token) return;
  Cookies.set("refresh_token", token, { ...authCookieOptions, expires: 30 });
}

export function hasRefreshCredential(): boolean {
  return JWT_REFRESH_HTTPONLY || Boolean(Cookies.get("refresh_token"));
}
