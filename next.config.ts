import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-hotkeys-hook ships ESM-only (no CJS build). Next's bundler already
  // handles that fine, but Jest's CommonJS-based transform needs the package
  // explicitly opted in, or it fails on the bare `import` syntax.
  transpilePackages: ["react-hotkeys-hook"],
};

export default nextConfig;
