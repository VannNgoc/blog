import type { NextConfig } from "next";

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
};

export default nextConfig;
