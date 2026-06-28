import Cookies from "js-cookie";

export function clearAuthCookies() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}

export function handleSessionExpired() {
  if (typeof window !== "undefined") {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    if (
      returnTo &&
      returnTo !== "/" &&
      !returnTo.startsWith("/login") &&
      !returnTo.startsWith("/register")
    ) {
      sessionStorage.setItem("africhess:return-after-login", returnTo);
    }
  }
  clearAuthCookies();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("africhess:session-expired"));
  const path = window.location.pathname;
  if (!["/login", "/register", "/auth/callback"].includes(path)) {
    window.location.href = "/login?expired=1";
  }
}

export function consumeReturnAfterLogin(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem("africhess:return-after-login");
  if (url) sessionStorage.removeItem("africhess:return-after-login");
  return url;
}
