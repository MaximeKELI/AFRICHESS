/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid .next owned by Docker root (EACCES on local npm run dev)
  distDir: process.env.NEXT_DIST_DIR || '.next-dev',
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
};

module.exports = nextConfig;
