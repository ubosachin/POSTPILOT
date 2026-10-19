import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://postpilot.io';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/landing', '/login'],
        disallow: ['/api/', '/admin/', '/settings/', '/billing/', '/social-accounts/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
