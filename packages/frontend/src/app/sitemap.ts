import type { MetadataRoute } from 'next'

const SITE_URL = 'https://eventecos.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/events',
    '/venues',
    '/vendors',
    '/about',
    '/vs/tripleseat',
    '/vs/perfect-venue',
    '/privacy-policy',
    '/terms-of-service',
  ]

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }))
}
