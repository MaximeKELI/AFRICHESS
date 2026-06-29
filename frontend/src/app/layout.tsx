import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { FooterGate } from "@/components/layout/FooterGate";

export const metadata: Metadata = {
  title: "AFRICHESS — Global Chess Platform",
  description: "Play chess online, train tactics, join clubs and communities worldwide.",
  icons: { icon: "/images/logo.png" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "AFRICHESS" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-body has-mobile-nav">
        <Providers>
          <Navbar />
          <main className="flex-1 min-w-0">{children}</main>
          <FooterGate />
        </Providers>
      </body>
    </html>
  );
}
