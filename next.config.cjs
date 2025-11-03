/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true // Disable image optimization completely
  },
  // Disable static export for now to see if that resolves the issue
  // output: 'export',
  // distDir: 'out',
};

module.exports = nextConfig;