import type { MetadataRoute } from 'next';

import { getIndexableProductSlugs } from '@/lib/catalog-page';

export const dynamic = 'force-dynamic';

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000').replace(
    /\/$/,
    '',
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = baseUrl();
  const slugs = await getIndexableProductSlugs();
  return [
    { url: `${root}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${root}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${root}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    ...slugs.map((slug) => ({
      url: `${root}/servicio/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
