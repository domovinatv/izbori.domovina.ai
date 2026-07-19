import type { NextConfig } from "next";

// Fully static site: every route is SSG from web/public/data JSON exports.
// `output: "export"` emits plain HTML into out/, served as Cloudflare
// Workers static assets (no server function needed).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
