import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const API_ORIGIN = "https://vc-crm-demo.onrender.com";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${API_ORIGIN}`,
      "font-src 'self' data:",
      `media-src 'self' blob: data: ${API_ORIGIN}`,
      `connect-src 'self' ${API_ORIGIN} wss://${API_ORIGIN.replace('https://', '')} https://*.ingest.sentry.io https://*.sentry.io`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
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

export default withSentryConfig(nextConfig, {
  // Sentry is only active when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN env vars are set.
  // Source map upload requires SENTRY_AUTH_TOKEN (optional).
  silent: true,
});
