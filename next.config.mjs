/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['motion'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
