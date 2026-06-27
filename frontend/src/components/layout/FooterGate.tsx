"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

const HIDE_FOOTER_PREFIXES = ["/play", "/puzzles", "/watch", "/learning/analyze/board"];

export function FooterGate() {
  const pathname = usePathname();
  const hide = HIDE_FOOTER_PREFIXES.some((p) => pathname.startsWith(p));

  if (hide) return null;
  return <Footer />;
}
