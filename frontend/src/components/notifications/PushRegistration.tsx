"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { registerWebPush } from "@/lib/pushNotifications";

/** Enregistre le navigateur pour Web Push (VAPID) après connexion. */
export function PushRegistration() {
  const { user } = useAuthStore();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || registeredRef.current) return;
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }
    registeredRef.current = true;
    void registerWebPush().catch(() => {
      registeredRef.current = false;
    });
  }, [user]);

  return null;
}
