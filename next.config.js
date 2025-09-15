/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose test mode to the browser
  env: {
    NEXT_PUBLIC_IS_TEST_MODE:
      process.env.NODE_ENV === 'test' ? 'true' : 'false',
  },
  // Enable experimental features for better performance
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['@supabase/supabase-js', 'openai', 'lucide-react'],
    optimizeServerReact: true,
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Skip redundant quality checks during build - CI/CD handles these
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Bundle analyzer (only when ANALYZE=true)
  ...(process.env.ANALYZE === 'true' && {
    webpack: config => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
      return config;
    },
  }),

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Suppress critical dependency warnings from Supabase realtime-js
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ];

    // Ensure TypeScript path mapping works correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
    };

    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: 20,
            reuseExistingChunk: true,
          },
          lib: {
            test: /[\\/]src[\\/]lib[\\/]/,
            name: 'lib',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // Optimize headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,

  // Power packed with React strict mode for development
  reactStrictMode: true,

  // Output optimization
  output: 'standalone',
};

module.exports = nextConfig;
