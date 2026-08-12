import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in proxy.ts instead — it needs
// a fresh nonce every request for Next's own inline hydration scripts, which
// a static header here can't provide.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // react-hotkeys-hook ships ESM-only (no CJS build). Next's bundler already
  // handles that fine, but Jest's CommonJS-based transform needs the package
  // explicitly opted in, or it fails on the bare `import` syntax.
  transpilePackages: ["react-hotkeys-hook"],

  // Pins the workspace root to this project. Without this, an orphaned
  // package-lock.json in the parent home directory makes Next.js guess the
  // wrong root and warn about it on every build.
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
