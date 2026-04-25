import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Generate a stable build ID once per build invocation
const BUILD_ID = randomBytes(4).toString("hex");

/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Limit referrer information sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict access to browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=()"
  },
  // Basic XSS protection for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" }
];

const nextConfig = {
  productionBrowserSourceMaps: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      // Read template, stamp with build ID, write sw.js — keeps template pristine
      const root = process.cwd();
      const template = readFileSync(join(root, "public", "sw.template.js"), "utf8");
      const stamped = template.replace(/__BUILD_ID__/g, BUILD_ID);
      writeFileSync(join(root, "public", "sw.js"), stamped, "utf8");
    }
    return config;
  }
};

export default nextConfig;
