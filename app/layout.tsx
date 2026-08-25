import type { Metadata } from "next";
import { headers } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { Geist_Mono, Lato, Source_Serif_4 } from "next/font/google";
import Header from "../ui/header";

import "./globals.css";

// The UI and display face. Lato is a humanist sans — warmer and more open
// than a geometric grotesque, which keeps it from reading as a dashboard next
// to the serif body. Only 400 and 700 are loaded: Lato isn't a variable font,
// so every additional weight is another file to download.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "optional",
});

// The reading face. Post bodies and post titles are the one surface where
// people actually *read* rather than operate, and Geist is a UI grotesque —
// good for chrome, not built for sustained prose. Source Serif 4 is drawn for
// screen reading and carries the page's personality, which matters more than
// usual here because the palette is deliberately monochrome.
//
// Loaded through next/font rather than a <link>: the CSP is `font-src 'self'`,
// so a Google Fonts URL is silently blocked (which is exactly how the vendored
// template's Inter and DM Sans failed). next/font self-hosts at build time.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  // `optional`, not the `swap` default. With `swap` the body text paints in
  // the fallback, then repaints when the real face arrives — and Chrome
  // records that repaint as a *new* Largest Contentful Paint candidate, so LCP
  // tracked font download rather than content. Measured on /posts/187: LCP ran
  // 2126ms when the face happened to arrive early and 4291ms when it didn't,
  // off the same build. `optional` gives the font ~100ms and otherwise keeps
  // the fallback for that page view, so LCP stops depending on the race.
  // next/font's metric-matched fallback means the fallback is close enough in
  // size that nothing shifts (CLS stayed 0 throughout).
  display: "optional",
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
        className={`${lato.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased flex min-h-screen flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-70 focus:rounded-md focus:bg-zinc-800 focus:px-4 focus:py-2 focus:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
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
