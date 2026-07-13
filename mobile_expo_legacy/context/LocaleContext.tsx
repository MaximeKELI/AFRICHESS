import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { type MobileLocale, translate as tr } from "../lib/i18n";

interface LocaleContextValue {
  locale: MobileLocale;
  setLocale: (locale: MobileLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<MobileLocale>("fr");

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => tr(locale, key, params),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslation requires LocaleProvider");
  return ctx;
}
