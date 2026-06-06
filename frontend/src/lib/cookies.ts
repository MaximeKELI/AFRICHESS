import Cookies from "js-cookie";

const isProd = process.env.NODE_ENV === "production";

export const authCookieOptions = {
  sameSite: "strict" as const,
  secure: isProd,
};

export function setAccessToken(token: string) {
  Cookies.set("access_token", token, { ...authCookieOptions, expires: 1 });
}

export function setRefreshToken(token: string) {
  Cookies.set("refresh_token", token, { ...authCookieOptions, expires: 7 });
}
