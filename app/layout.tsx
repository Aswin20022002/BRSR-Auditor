import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "BRSR Auditor: check what a sustainability report really discloses",
  description: "Upload a BRSR or annual report PDF and get a page-cited audit of all nine SEBI BRSR Core attributes, greenwashing flags, consistency checks and a fix list.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2b43d1" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold">
          Skip to content
        </a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
          {children}
        </main>
        <footer className="no-print border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-mute sm:px-6">
            <p className="max-w-3xl">
              BRSR Auditor scores the quality of a disclosure, not a company&apos;s ESG performance. AI can make mistakes, so every value links to the quoted source text and the PDF page. Built for a course project on AI in ESG. Not investment or assurance advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
