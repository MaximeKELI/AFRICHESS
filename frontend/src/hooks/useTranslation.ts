"use client";

import { useCallback } from "react";
import { translate, type Locale, type MessageParams } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";

export function useTranslation() {
  const locale = useAuthStore((s) => s.locale);

  const t = useCallback(
    (key: string, params?: MessageParams) => translate(locale, key, params),
    [locale]
  );

  return { t, locale, isRtl: locale === "ar" };
}
