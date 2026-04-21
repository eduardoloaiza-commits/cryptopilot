import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cryptopilot/db", "@cryptopilot/shared"],
};

export default nextConfig;
