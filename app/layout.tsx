import type { Metadata } from "next";
import { headers } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono } from "next/font/google";
import Header from "../ui/header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Exposed as --font-mono for prose/code that may want it, but nothing in the
// app currently renders in it. Preloading it downloaded a whole second family
// on every route for glyphs that never got drawn; `preload: false` keeps the
// variable working and fetches the face only if something actually uses it.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Recollections",
  description: "Retrieving forgotten memories one post at a time.",
};

// Runs before first paint so the `.dark` class matches the saved/OS preference
// without a flash of the wrong theme.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by proxy.ts on every document request — required so this inline
  // script satisfies the nonce'd script-src in the CSP header it also sets.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Browsers hide the `nonce` attribute's value after the initial render
            (a CSP protection against reading it back out via the DOM), which
            makes React's hydration check see a mismatch against the real
            server-rendered value — harmless, expected, and unrelated to the
            script's actual behavior. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-70 focus:rounded-md focus:bg-zinc-800 focus:px-4 focus:py-2 focus:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
        >
          Skip to content
        </a>
        <Header />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
