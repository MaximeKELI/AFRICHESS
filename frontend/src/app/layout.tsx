import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BodyLayoutClasses } from "@/components/layout/BodyLayoutClasses";
import { FooterGate } from "@/components/layout/FooterGate";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AFRICHESS — Global Chess Platform",
  description: "Play chess online, train tactics, join clubs and communities worldwide.",
  icons: { icon: "/images/logo.png" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "AFRICHESS" },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;c.toggle('dark',d);if(localStorage.getItem('lowBandwidth')==='1')c.add('low-bandwidth');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col font-body has-mobile-nav">
        <Providers>
          <SkipLink />
          <BodyLayoutClasses />
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none page-enter">
            {children}
          </main>
          <FooterGate />
        </Providers>
      </body>
    </html>
  );
}
