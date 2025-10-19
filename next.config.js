/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'data.riksdagen.se',
      },
    ],
  },
};

module.exports = nextConfig;
