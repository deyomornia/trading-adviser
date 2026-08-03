import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS folder. Without this, a stray
  // package-lock.json in the home directory made Next.js guess the wrong
  // root and skip middleware.ts (which gates our protected pages).
  turbopack: {
    root: __dirname,
  },

  // Security headers on every response. HSTS is already set by Vercel.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // No other site may embed this app in a frame (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Never MIME-sniff responses into executable types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (with query params) to external sites.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app never needs camera/mic/geolocation.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
