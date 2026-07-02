/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [],
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
