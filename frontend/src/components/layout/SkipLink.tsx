"use client";

import { useTranslation } from "@/hooks/useTranslation";

export function SkipLink() {
  const { t } = useTranslation();

  return (
    <a href="#main-content" className="skip-link">
      {t("common.skipLink")}
    </a>
  );
}
