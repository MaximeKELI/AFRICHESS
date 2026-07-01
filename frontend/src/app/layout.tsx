import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BodyLayoutClasses } from "@/components/layout/BodyLayoutClasses";
import { FooterGate } from "@/components/layout/FooterGate";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: "AFRICHESS — Global Chess Platform",
  description: "Play chess online, train tactics, join clubs and communities worldwide.",
  icons: { icon: "/images/logo.png" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "AFRICHESS" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-body has-mobile-nav">
        <Providers>
          <SkipLink />
          <BodyLayoutClasses />
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
            {children}
          </main>
          <FooterGate />
        </Providers>
      </body>
    </html>
  );
}
