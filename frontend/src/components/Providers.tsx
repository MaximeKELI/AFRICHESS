"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { ActivityTracker } from "@/components/analytics/ActivityTracker";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { PushRegistration } from "@/components/notifications/PushRegistration";
import { GameInviteRedirect } from "@/components/notifications/GameInviteRedirect";
import { initAiSpeech } from "@/lib/aiSpeech";
import { refreshAuthTokens } from "@/lib/api";
import { JWT_REFRESH_HTTPONLY } from "@/lib/authConfig";
import { setChessSoundTheme } from "@/lib/chessSounds";
import { usePreferencesStore } from "@/store/preferences";
import Cookies from "js-cookie";

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchProfile, darkMode, lowBandwidth, locale, logout } = useAuthStore();
  const soundTheme = usePreferencesStore((s) => s.soundTheme);

  useEffect(() => {
    const init = async () => {
      if (!Cookies.get("access_token") && !Cookies.get("refresh_token") && JWT_REFRESH_HTTPONLY) {
        await refreshAuthTokens();
      }
      if (Cookies.get("access_token") || Cookies.get("refresh_token")) {
        fetchProfile();
      }
    };
    void init();
  }, [fetchProfile]);

  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener("africhess:session-expired", onExpired);
    return () => window.removeEventListener("africhess:session-expired", onExpired);
  }, [logout]);

  /** Renouvellement proactif — évite la déconnexion en pleine partie (~15 min). */
  useEffect(() => {
    const tick = () => {
      if (JWT_REFRESH_HTTPONLY || Cookies.get("refresh_token")) void refreshAuthTokens();
    };
    tick();
    const interval = window.setInterval(tick, 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("low-bandwidth", lowBandwidth);
  }, [lowBandwidth]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    setChessSoundTheme(soundTheme);
  }, [soundTheme]);

  useEffect(() => {
    initAiSpeech();
    const warm = () => initAiSpeech();
    window.addEventListener("pointerdown", warm, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, []);

  return (
    <>
      <SiteBackground />
      <ActivityTracker />
      <PwaInstallPrompt />
      <PushRegistration />
      <GameInviteRedirect />
      {children}
    </>
  );
}
