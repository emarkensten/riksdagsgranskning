/** @type {import('next').NextConfig} */
const nextConfig = {
  // /spanningar var metodsidan innan den fanns på riktigt. Essän som låg där
  // är nu sista avsnittet på /metod.
  async redirects() {
    return [{ source: '/spanningar', destination: '/metod#hyckleri', permanent: true }]
  },
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
