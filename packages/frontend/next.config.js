/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [],
  eslint: {
    // Monorepo has conflicting eslint majors between frontend (v8) and backend
    // (v9), which breaks npm workspace hoisting for eslint-plugin-react during
    // a clean install (e.g. on Vercel). Lint is run separately in CI, so don't
    // let it block the production build.
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  },
  // Optimize for production
  swcMinify: true,
  images: {
    domains: ['unzfkcmmakyyjgruexpy.supabase.co'], // Supabase storage
  },
  // Reduce build output
  productionBrowserSourceMaps: false,
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig
