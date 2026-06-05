"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 glass-card p-4 shadow-xl border border-africhess-gold/30">
      <p className="text-sm mb-3">{t("pwa.installHint")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            setDismissed(true);
          }}
          className="flex-1 py-2 rounded-lg african-gradient text-white text-sm font-medium"
        >
          {t("pwa.install")}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-2 rounded-lg border border-white/20 text-sm"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
