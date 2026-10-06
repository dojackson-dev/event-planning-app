import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/client-portal', '/vendors/dashboard', '/artist/dashboard'],
      },
    ],
    sitemap: 'https://eventecos.com/sitemap.xml',
  }
}
