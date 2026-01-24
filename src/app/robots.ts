import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/portfolio-summary',
          '/api/',
          '/onboarding',
          '/login',
          '/signup',
          '/my-properties',
          '/settings',
          '/analytics',
          '/calculator',
          '/calendar',
          '/data',
          '/mortgage-calculator',
          '/mortgages',
        ],
      },
    ],
    sitemap: process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`
      : undefined,
  }
}
