/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.plugins = config.plugins.filter(
        (plugin) => plugin?.constructor?.name !== 'ForkTsCheckerWebpackPlugin'
      );
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      ...(process.env.NEXT_PUBLIC_MEDIA_HOSTNAME || "")
        .split(",")
        .filter(Boolean)
        .map((hostname) => ({ protocol: "https", hostname: hostname.trim() })),
    ],
    unoptimized: process.env.NODE_ENV !== "production",
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

const sentryOptions = {
  silent: true,
  disableLogger: true,
};

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? require("@sentry/nextjs").withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
