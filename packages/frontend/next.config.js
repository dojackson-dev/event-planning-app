/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [],
  // Strip the Vercel bypass query param before it reaches the app router
  // so it doesn't appear in useSearchParams / affect routing
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'query', key: 'x-vercel-protection-bypass' }],
        destination: '/:path*',
        permanent: false,
      },
    ]
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
