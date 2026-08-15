/** @type {import('next').NextConfig} */
const nextConfig = {
  // Typsnittsfilerna läses med readFile av delningsbilderna och refereras
  // därför inte av någon import. Utan den här raden spårar bygget dem inte,
  // och varje og-bild kastar ENOENT i produktion medan den fungerar lokalt.
  experimental: {
    outputFileTracingIncludes: { '/**': ['./lib/og/*.ttf'] },
  },
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
