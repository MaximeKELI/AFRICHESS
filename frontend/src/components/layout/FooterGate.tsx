"use client";

import { usePathname } from "next/navigation";
import { isImmersiveRoute } from "@/lib/immersiveRoutes";
import { Footer } from "./Footer";

export function FooterGate() {
  const pathname = usePathname();
  const hide = isImmersiveRoute(pathname);

  if (hide) return null;
  return <Footer />;
}
