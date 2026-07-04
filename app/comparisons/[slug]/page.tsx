import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComparisonDetail } from './comparison-detail';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { getComparison, listComparisonSlugs, listComparisons, recommendRelatedComparisons } from '@/lib/api/ssr';

export const revalidate = 3600; // ISR

export async function generateStaticParams() {
  return (await listComparisonSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const comparison = await getComparison(params.slug);
  if (!comparison) return { title: 'Comparison Not Found' };
  return buildMetadata({
    title: comparison.seoTitle || comparison.title,
    description: comparison.metaDescription || comparison.excerpt || comparison.summary,
    path: `/comparisons/${comparison.slug}`,
    image: comparison.productA?.image,
    type: 'article',
    publishedTime: comparison.publishedAt || undefined,
    modifiedTime: comparison.updatedAt,
  });
}

export default async function ComparisonPage({ params }: { params: { slug: string } }) {
  const comparison = await getComparison(params.slug);
  if (!comparison) notFound();

  // DB-backed recommendations (Phase 11), with a latest-comparisons fallback.
  let related = await recommendRelatedComparisons(comparison.id, 3);
  if (related.length === 0) {
    related = (await listComparisons(4)).filter((c) => c.id !== comparison.id).slice(0, 3);
  }

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            headline: comparison.title,
            description: comparison.excerpt || comparison.summary,
            image: comparison.productA?.image,
            path: `/comparisons/${comparison.slug}`,
            datePublished: comparison.publishedAt,
            dateModified: comparison.updatedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Comparisons', path: '/comparisons' },
            { name: comparison.title, path: `/comparisons/${comparison.slug}` },
          ]),
          // FAQ schema only when the comparison has real editorial FAQ entries.
          ...(comparison.faq?.length ? [faqJsonLd(comparison.faq)] : []),
        ]}
      />
      <ComparisonDetail comparison={comparison} relatedComparisons={related} />
    </>
  );
}
