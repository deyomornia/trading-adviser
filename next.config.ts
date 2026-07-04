import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS folder. Without this, a stray
  // package-lock.json in the home directory made Next.js guess the wrong
  // root and skip middleware.ts (which gates our protected pages).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
