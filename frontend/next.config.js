/** @type {import('next').NextConfig} */
const nextConfig = {
  // Writable by local user (Docker must set NEXT_DIST_DIR=.next)
  distDir: process.env.NEXT_DIST_DIR || 'node_modules/.cache/next',
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
};

module.exports = nextConfig;
