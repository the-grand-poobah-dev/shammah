/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['lucide-react', 'motion'],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
