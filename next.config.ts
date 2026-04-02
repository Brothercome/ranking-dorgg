import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.communitydragon.org" },
      { protocol: "https", hostname: "media.valorant-api.com" },
    ],
  },
};

export default nextConfig;
