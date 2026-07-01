"use client";

import { LegalDocumentView } from "@/components/legal/LegalDocument";
import { getPrivacyPolicy } from "@/content/legal";
import { useTranslation } from "@/hooks/useTranslation";

export default function PrivacyPolicyPage() {
  const { locale, t } = useTranslation();
  const doc = getPrivacyPolicy(locale);

  return (
    <LegalDocumentView
      doc={doc}
      backLabel={t("legal.backHome")}
      tocLabel={t("legal.toc")}
    />
  );
}
