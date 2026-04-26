import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
