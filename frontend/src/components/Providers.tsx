"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import Cookies from "js-cookie";

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchProfile, darkMode, lowBandwidth } = useAuthStore();

  useEffect(() => {
    if (Cookies.get("access_token")) {
      fetchProfile();
    }
  }, [fetchProfile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("low-bandwidth", lowBandwidth);
  }, [lowBandwidth]);

  return <>{children}</>;
}
