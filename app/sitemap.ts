import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';
import {
  listProductSlugs,
  listCategorySlugs,
  listBrandSlugs,
  listGuideSlugs,
  listComparisonSlugs,
  listAuthorSlugs,
} from '@/lib/api/ssr';

export const revalidate = 3600;

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency'];

function entries(
  prefix: string,
  slugs: string[],
  priority: number,
  changeFrequency: ChangeFreq,
  lastModified: Date,
): MetadataRoute.Sitemap {
  return slugs.map((slug) => ({
    url: `${SITE.url}${prefix}/${slug}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/categories`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE.url}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE.url}/guides`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE.url}/comparisons`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE.url}/authors`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE.url}/deals`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE.url}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const [products, categories, brands, guides, comparisons, authors] = await Promise.all([
    listProductSlugs(),
    listCategorySlugs(),
    listBrandSlugs(),
    listGuideSlugs(),
    listComparisonSlugs(),
    listAuthorSlugs(),
  ]);

  return [
    ...staticRoutes,
    ...entries('/products', products, 0.8, 'weekly', now),
    ...entries('/categories', categories, 0.7, 'weekly', now),
    ...entries('/brands', brands, 0.6, 'weekly', now),
    ...entries('/guides', guides, 0.7, 'monthly', now),
    ...entries('/comparisons', comparisons, 0.7, 'monthly', now),
    ...entries('/authors', authors, 0.5, 'monthly', now),
  ];
}
