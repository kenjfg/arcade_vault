import type { NextConfig } from "next";

// SPEC 16. No CSP yet: it needs nonces in proxy.ts and its own spec.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Browsers ignore HSTS over plain HTTP, so localhost is unaffected.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
};

export default nextConfig;
