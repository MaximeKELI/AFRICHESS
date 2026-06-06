import Cookies from "js-cookie";

const isProd = process.env.NODE_ENV === "production";

export const authCookieOptions = {
  sameSite: "strict" as const,
  secure: isProd,
};

export function setAccessToken(token: string) {
  // Aligné sur ACCESS_TOKEN_LIFETIME backend (15 min) — marge cookie 1 h
  Cookies.set("access_token", token, { ...authCookieOptions, expires: 1 / 24 });
}

export function setRefreshToken(token: string) {
  Cookies.set("refresh_token", token, { ...authCookieOptions, expires: 7 });
}
