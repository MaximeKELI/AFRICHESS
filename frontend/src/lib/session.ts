import Cookies from "js-cookie";

export function clearAuthCookies() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}

export function handleSessionExpired() {
  clearAuthCookies();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("africhess:session-expired"));
  const path = window.location.pathname;
  if (!["/login", "/register", "/auth/callback"].includes(path)) {
    window.location.href = "/login?expired=1";
  }
}
