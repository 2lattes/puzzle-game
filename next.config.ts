import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Next.js 15: Handle native modules like 'canvas' for server components
  serverExternalPackages: ["canvas"],
  webpack: (config) => {
    // Robust check for externals array before pushing
    if (config.externals) {
      if (Array.isArray(config.externals)) {
        config.externals.push({ canvas: "canvas" });
      } else if (typeof config.externals === "object") {
        config.externals = { ...config.externals, canvas: "canvas" };
      }
    } else {
      config.externals = [{ canvas: "canvas" }];
    }
    return config;
  },
};

export default nextConfig;
