"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { ActivityTracker } from "@/components/analytics/ActivityTracker";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { initAiSpeech } from "@/lib/aiSpeech";
import Cookies from "js-cookie";

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchProfile, darkMode, lowBandwidth, locale, logout } = useAuthStore();

  useEffect(() => {
    if (Cookies.get("access_token") || Cookies.get("refresh_token")) {
      fetchProfile();
    }
  }, [fetchProfile]);

  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener("africhess:session-expired", onExpired);
    return () => window.removeEventListener("africhess:session-expired", onExpired);
  }, [logout]);

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
      {children}
    </>
  );
}
