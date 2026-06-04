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
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("low-bandwidth", lowBandwidth);
  }, [fetchProfile, darkMode, lowBandwidth]);

  return <>{children}</>;
}
