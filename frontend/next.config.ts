// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

// next.config.ts
import { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // This is necessary to make webpack 5 work with the Solana libraries
    config.resolve.fallback = {
      crypto: false,
      stream: false,
      path: false,
      fs: false,
      os: false,
      buffer: require.resolve("buffer/"),
    };

    return config;
  },
  // Add a custom header to allow the buffer module to be loaded
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
