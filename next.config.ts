import type { NextConfig } from "next";

// ImageKit serves the originals (PDF viewer iframes them, thumbnails load as
// images), so its origin belongs in the CSP. Configured at build time from
// env with the standard ImageKit domain as fallback.
const imagekitOrigin = (() => {
  try {
    return process.env.IMAGEKIT_URL_ENDPOINT
      ? new URL(process.env.IMAGEKIT_URL_ENDPOINT).origin
      : "https://ik.imagekit.io";
  } catch {
    return "https://ik.imagekit.io";
  }
})();

// 'unsafe-eval' is required by the Next dev runtime (React Refresh); it is
// dropped in production builds.
const devScriptSrc = process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${devScriptSrc}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  `frame-src 'self' ${imagekitOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
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
