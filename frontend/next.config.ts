import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.100.16",
    "localhost",
    "127.0.0.1",
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
