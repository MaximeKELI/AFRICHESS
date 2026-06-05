"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, trackPageView } from "@/lib/analytics";

export function ActivityTracker() {
  const pathname = usePathname();

  useEffect(() => initAnalytics(), []);

  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  return null;
}
