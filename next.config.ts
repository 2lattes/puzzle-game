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
  webpack: (config) => {
    config.externals.push({
      canvas: "canvas",
    });
    return config;
  },
};

export default nextConfig;
