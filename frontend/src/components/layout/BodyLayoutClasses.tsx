"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isImmersiveRoute } from "@/lib/immersiveRoutes";

/** Ajuste le padding bas mobile quand la barre de navigation est masquée. */
export function BodyLayoutClasses() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.toggle("has-mobile-nav", !isImmersiveRoute(pathname));
  }, [pathname]);

  return null;
}
