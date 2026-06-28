"use client";

import { Suspense } from "react";
import UserSearchPage from "./UserSearchContent";
import { useTranslation } from "@/hooks/useTranslation";

export default function Page() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<p className="max-w-2xl mx-auto px-4 py-12 opacity-60">{t("common.loading")}</p>}>
      <UserSearchPage />
    </Suspense>
  );
}
