/**
 * Next.js Configuration for CareSyncRx
 */

import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // For better chunk handling
    optimizeCss: true,
  },
  // HTTPS support for development (needed for speech recognition)
  ...(process.env.NODE_ENV === 'development' && process.env.HTTPS === 'true' && {
    server: {
      https: true,
    },
  }),
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http', 
        hostname: 'localhost',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  // Improve webpack configuration to handle chunks better
  webpack: (config, { isServer }) => {
    // Optimize for better chunk loading
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    };
    
    // Return the modified config
    return config;
  },
};

export default nextConfig;