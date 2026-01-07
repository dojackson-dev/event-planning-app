/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
  },
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig
