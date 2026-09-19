import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const root = (
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/mi-cuenta', '/pedido', '/api'],
      },
    ],
    sitemap: `${root}/sitemap.xml`,
  };
}
