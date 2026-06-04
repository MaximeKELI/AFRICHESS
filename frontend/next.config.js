/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build outside frontend/ — Docker root-owned .next* caused EACCES locally
  distDir: process.env.NEXT_DIST_DIR || '../.next-build',
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
};

module.exports = nextConfig;
