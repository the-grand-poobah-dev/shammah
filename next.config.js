process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = '1';

const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants');

/** @type {import('next').NextConfig} */
module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  if (phase === PHASE_PRODUCTION_BUILD) {
    process.env.NODE_ENV = 'production';
  }

  return {
    distDir: isDev ? '.next-dev' : '.next',
    output: isDev ? undefined : 'standalone',
    transpilePackages: ['lucide-react'],
    env: {
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        '',
    },
  };
};
